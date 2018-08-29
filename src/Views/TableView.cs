namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;
    using Nancy;
    using NGettext;

    using Microsoft.EntityFrameworkCore;
    using Microsoft.EntityFrameworkCore.Infrastructure;

    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;
    using FunWithFlags.FunDB.Attribute;
    using FunWithFlags.FunDB.View;
    using FieldName = FunWithFlags.FunDB.FunQL.AST.FieldName;
    using Result = FunWithFlags.FunDB.FunQL.AST.Result<FunWithFlags.FunDB.FunQL.AST.FieldName>;

    public class TableView : IView
    {
        public ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;

            // FIXME: Valid only for single-entity queries! Rewrite hrefs to use row attributes instead.
            // For example, a user might specify a query like this:
            // SELECT { Link = { UserView = 'FieldsForm', Parameters = { id = Id } } } Name FROM Fields
            var resultId = Tuple.Create(new AttributeMap(), Result.NewRField(new FieldName(null, "Id")));
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeResults(new[] { resultId });
            var result = ctx.Resolver.RunQuery(newQuery);
            var childName = parsedQuery.Attributes.GetStringWithDefault(null, "ChildView");
            var childUv = ctx.Database.UserViews.Single(cuv => cuv.Name == childName);

            var columns = result.Columns.Skip(1).Select(col => new
                {
                    Field = col.Field,
                    Name = col.DisplayName,
                    Width = col.Attributes.GetIntWithDefault(100, "Size", "Width").ToString() + "px"
                }).ToList();

            var entries = result.Rows.Select(row =>
                    {
                        var id = row.Cells[0].Value.GetInt();
                        var height = row.Attributes.GetIntWithDefault(100, "Size", "Height").ToString() + "px";
                        return row.Cells.Skip(1).Zip(columns, (cell, col) => new
                            {
                                Value = cell.ToString(),
                                Width = col.Width,
                                Height = height,
                                Id = id,
                                Url = $"../uv/{childUv.Id}?recId={id}",
                            }
                            ).ToList();
                    }).ToList();

            var model = new Dictionary<string, object>()
                { { "ColorTableSelect", db.Settings.Single(s => s.Name == "ColorTableSelect").Value },
                  // FIMXE: Rename.
                  { "ColorTableBg", db.Settings.Single(s => s.Name == "ColorTableBg").Value },
                  { "ColorTableBd", db.Settings.Single(s => s.Name == "ColorTableBd").Value },
                  { "Titles", columns },
                  { "Entries", entries }
                };

            return new ViewPage { Name = "table", Attributes = model, Menus = new ViewMenu[] {} };
        }

        public ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars)
        {
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var pPars = new Dictionary<string, string>();
            string updId= getPars["recId"].Value;
            foreach (var k in (DynamicDictionary)getPars)
            {
                if (k != "recId")
                {
                    pPars.Add(k, getPars[k]);
                }                  
            };
            ctx.Resolver.UpdateEntry(parsedQuery, Int32.Parse(updId), pPars);
            return new ViewRedirect { Url = $"~/uv/{uv.Id}" };
            //throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
