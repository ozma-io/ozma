namespace FunWithFlags.FunApp
{
    using System;
    using System.Linq;
    using Microsoft.EntityFrameworkCore;
    using System.Collections.Generic;
    using Nancy;
    using Nancy.Responses;
    using Nancy.Security;
    using System.Dynamic;
    using NGettext;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;
    using FunWithFlags.FunApp.Views;

    using Nancy.ModelBinding;
    using Nancy.Extensions;
    using Newtonsoft.Json;

    public class AppModule : NancyModule
    {
        static View GetView(string name)
        {
            // FIXME: rewrite using reflection.
            switch (name)
            {
                case "Table":
                    return new TableView();
                case "Form":
                    return new FormView();
                case "Calendar":
                    return new CalendarView();
                default:
                    throw new ArgumentException($"Unknown view type: {name}");
            }
        }

        dynamic RenderView(DatabaseContext db, UserView uv, ViewResponse view)
        {
            if (view is ViewPage)
            {
                var page = (ViewPage)view;
                var attrs = page.Attributes;
                attrs["MenuBar"] = RenderMenuBar(db, uv, page.Menus);
                return this.View[page.Name, attrs];
            }
            else if (view is ViewRedirect)
            {
                var redirect = (ViewRedirect)view;
                return this.Response.AsRedirect(redirect.Url);
            }
            else
            {
                throw new NotImplementedException($"Unknown view response type: {view.GetType()}");
            }
        }

        ViewMenuItem RenderAction(DatabaseContext db, ButtonAction action)
        {
            if (action is UserViewAction)
            {
                var uvAction = (UserViewAction)action;

                string name;
                if (uvAction.DisplayName == null)
                {
                    // FIXME: slow -- called for every action separately.
                    var uv = db.UserViews.Single(cuv => cuv.Id == uvAction.UserViewId);
                    name = uv.DisplayName;
                }
                else
                {
                    name = uvAction.DisplayName;
                }

                return new ViewMenuItem {
                    Name = name,
                    Url = this.Context.ToFullPath($"~/uv/{uvAction.UserViewId}")
                };
            }
            else
            {
                throw new NotImplementedException($"Unknown action type: {action.GetType()}");
            }
        }       

        ExpandoObject RenderMenuBar(DatabaseContext db, UserView uv, IEnumerable<ViewMenu> extras)
        {
            var color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            var menus = db.UserViewMenus
                .Where(menu => menu.UserViewId == uv.Id)
                .OrderBy(menu => menu.OrdinalNum)
                .GroupJoin(db.UserViewButtons,
                           menu => menu.Id,
                           button => button.MenuId,
                           (menu, buttons) => new {
                               Name = menu.DisplayName,
                               Items = buttons
                                           .OrderBy(b => b.OrdinalNum)
                                           .Select(b => b.Action)
                                           .ToList()
                           })
                .ToList()
                .Select(m => new ViewMenu {
                        Name = m.Name,
                        Items = m.Items.Select(action => RenderAction(db, action)).ToList()
                    })
                .ToList();
            menus.AddRange(extras.Select(menu => new ViewMenu {
                        Name = menu.Name,
                        Items = menu.Items.Select(item => new ViewMenuItem {
                                    Name = item.Name,
                                    Url = this.Context.ToFullPath(item.Url)
                            }).ToList()
                    }));

            dynamic menuModel = new ExpandoObject();
            menuModel.BackColor = color;
            menuModel.Menus = menus;
            return menuModel;
        }

        public AppModule(Context ctx, ICatalog catalog)
        {
            this.RequiresAuthentication();
            var db = ctx.Database;

            Get("/", _ =>
            {
                return this.Response.AsRedirect("~/nav", RedirectResponse.RedirectType.Permanent);
            });

            Get("/nav/", _ =>
            {
                var color = db.Settings.Single(s => s.Name == "bgcolor").Value;
                var menus = db.MainMenuCategories
                    .OrderBy(cat => cat.OrdinalNum)
                    .GroupJoin(db.MainMenuButtons,
                              cat => cat.Id,
                              button => button.CategoryId,
                              (cat, buttons) => new {
                                  Name = cat.DisplayName,
                                  Items = buttons
                                              .OrderBy(b => b.OrdinalNum)
                                              .Select(b => b.Action)
                                              .ToList()
                              })
                    .ToList()
                    .Select(m => new ViewMenu {
                            Name = m.Name,
                            Items = m.Items.Select(action => RenderAction(db, action)).ToList()
                        })
                    .ToList();
                var model = new {
                    MenuCategories = menus,
                    Color = color
                };

                return View["Navigator", model];
            });

            Get(@"/uv/{Id:int}/", pars =>
            {
                var id = (int)pars.Id;
                var uv = db.UserViews.FirstOrDefault(u => u.Id == id);
                if (uv == null)
                {
                    return HttpStatusCode.NotFound;
                }

                var view = GetView(uv.Type);
                return this.RenderView(db, uv, view.Get(ctx, catalog, uv, this.Request.Query));
            });
            Post(@"/uv/{Id:int}/", pars =>
            {
                var id = (int)pars.Id;
                var uv = db.UserViews.FirstOrDefault(u => u.Id == id);
                if (uv == null)
                {
                    return HttpStatusCode.NotFound;
                }

                var view = GetView(uv.Type);
                return this.RenderView(db, uv, view.Post(ctx, catalog, uv, this.Request.Query, this.Request.Form));
            });
        }
    }
}
