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

    public class TableView : View
    {
        public ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;

            // FIXME: Valid only for single-entity queries! Rewrite hrefs to use row attributes instead.
            // For example, a user might specify a query like this:
            // SELECT Name, { Link = { UserView = 'FieldsForm', Parameters = { id = Id } } } FROM Fields
            var resultId = Tuple.Create(Result.NewRField(new FieldName(null, "Id")), new AttributeMap());
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeResults(new[] { resultId });
            var result = ctx.Resolver.RunQuery(newQuery);

            var columns = result.Columns.Skip(1).Select(col => new
                {
                    Field = col.Field,
                    Name = col.Attributes.GetStringWithDefault(col.Name, "Caption"),
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
                                // FIXME: hacky as hell! Depends on uv ids!
                                href = $"window.location.href='../uv/{uv.Id+1}?recId={id}'",
                            }
                            ).ToList();
                        // сюда положить ссылку на юзервью с формой
                    }).ToList();

            var model = new Dictionary<string, object>()
                { { "Color", db.Settings.Single(s => s.Name == "bgcolor").Value },
                  { "ColorTableSelect", db.Settings.Single(s => s.Name == "ColorTableSelect").Value },
                  // FIMXE: Rename.
                  { "ColorTableBg", db.Settings.Single(s => s.Name == "ColorTableBg").Value },
                  { "ColorTableBd", db.Settings.Single(s => s.Name == "ColorTableBd").Value },
                  // Формируем название страницы в браузере
                  { "FormName", uv.DisplayName },

                  { "Titles", columns },
                  { "Entries", entries }
                };

            return new ViewPage { Name = "Table", Attributes = model, Menus = new ViewMenu[] {} };
        }

        public ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
