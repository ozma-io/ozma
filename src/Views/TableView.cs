namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;
    using Nancy;

    using Microsoft.EntityFrameworkCore;
    using Microsoft.EntityFrameworkCore.Infrastructure;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB;

    public class TableView : View
    {
        public string ViewName
        {
            get { return "Table"; }
        }

        public ViewType ViewType
        {
            get { return ViewType.Multiple; }
        }

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, dynamic getPars)
        {
            var db = dbQuery.Database;
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            // Формируем название страницы в браузере
            var entitiesQuery = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.UserViewId == uv.Id && uve.EntityId == e.Id
                ).Any()
            );
            model.FormName = entitiesQuery.First().DisplayNamePlural;

            var dbmodel = db.Entities.Include(e => e.Schema).Where(e =>
                db.UVEntities.Where(uve =>
                    uve.EntityId == e.Id &&
                    uve.UserViewId == uv.Id
                ).Any()
            ).GroupJoin(db.UVFields.Include(tuvf => tuvf.Field),
                ent => ent.Id,
                uvf => uvf.Field.EntityId,
                (ent, uvf) => new {
                    Entity = ent,
                    UVFields = uvf.ToList()
                }
            // FIXME: Workaround for https://github.com/aspnet/EntityFrameworkCore/issues/9609
            // We filter and sort UVFields after they are fetched with EFCore.
            ).ToList().Select(old_model => new {
                Entity = old_model.Entity,
                UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id).OrderBy(t => t.OrdNum).ToList()
            }).Single();
      
            model.Titles = dbmodel.UVFields;

            var query = SelectExpr.Single(Table.FromEntity(dbmodel.Entity), (new[] { "Id" } ).Concat(dbmodel.UVFields.Select(f => f.Field.Name)));
            var entries = dbQuery.Query(query).Select(l =>
                l.Skip(1).Select((a,i) => new
                    {
                        //Value = a,
                        Value = (dbmodel.UVFields[i].Field.BusinessType != "date") ? a : a.Substring(0,10),
                        Width = model.Titles[i].Width,
                        Height = uv.Height,
                        Id =  l[0],
                        href = "window.location.href='../uv/" + (uv.Id+1).ToString()+"?recId="+l[0].ToString()+"'", 
                }
                ).ToList()
                // сюда положить ссылку на юзервью с формой
            ).ToList();
/* 
            // ! - дописать
            for (int i=0; i<entries.Count(); i++) {
                for (int j=0; j<entries[i].Count(); j++) {
                    if (model.Titles[i].Type == "lookup") {
                        entries[i][j].Value = "FunFun";
                    }
                }
            }
*/
            model.Entries = entries;

            
            /*model.Entries = dbQuery.Query("Tests", new[]
                    {
                        "\"Name\"",
                        "\"Count\"",
                        "\"Description\"",
                        "\"Param1\"",
                        "\"Param2\"",
                    }, ""
            );*/
            
 
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
