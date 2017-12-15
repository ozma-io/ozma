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
    using FunWithFlags.FunDB.Context;
    using FunWithFlags.FunDB.Attribute;
    using FunWithFlags.FunDB.View;
    using FieldName = FunWithFlags.FunDB.FunQL.AST.FieldName;
    using Result = FunWithFlags.FunDB.FunQL.AST.Result<FunWithFlags.FunDB.FunQL.AST.FieldName>;

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

        public ExpandoObject Get(Context ctx, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;
            dynamic model = new ExpandoObject();

            // FIXME: Preload all settings once for a request.
            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;
            model.ColorTableSelect = db.Settings.Single(s => s.Name == "ColorTableSelect").Value;
            // FIMXE: Rename.
            model.ColorTableBg = db.Settings.Single(s => s.Name == "ColorTableBg").Value;
            model.ColorTableBd = db.Settings.Single(s => s.Name == "ColorTableBd").Value;

            // Формируем название страницы в браузере
            model.FormName = uv.DisplayName;

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
            model.Titles = columns;

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

            model.Entries = entries;
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(Context ctx, UserView uv, dynamic getPars, dynamic postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
