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
    using Result = FunWithFlags.FunDB.FunQL.AST.Result<FunWithFlags.FunDB.FunQL.AST.EntityName, FunWithFlags.FunDB.FunQL.AST.FieldName>;

    public class CalendarView : View
    {
        public string ViewName
        {
            get { return "Calendar"; }
        }

        public ViewType ViewType
        {
            get { return ViewType.Single; }
        }
                
        public ExpandoObject Get(Context ctx, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            // Формируем название страницы в браузере
            // FIXME: use name from UserView
            var entitie = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.UserViewId == uv.Id && uve.EntityId == e.Id
                ).Any()
            );
            model.FormName = entitie.First().DisplayNamePlural;

            var resultId = Tuple.Create(Result.NewRField(new FieldName(null, "Id")), new AttributeMap());
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeResults(new[] { resultId });
            var result = ctx.Resolver.RunQuery(newQuery);

            model.Titles = result.Columns.Skip(1).Select(col => new
            {
                Name = col.Name,
                Width = col.Attributes.GetIntWithDefault(100, "Size", "Width").ToString() + "px"
            });

            var entries = result.Rows.Select(row =>
                row.Cells.Skip(1).Zip(result.Columns.Skip(1), (cell, col) => new
                {
                    Value = (col.Field.BusinessType != "date") ? cell : cell.Substring(0, 10),
                    Duration = 1,
                    Id = row.Cells[0]
                }
                ).ToList()
            ).ToList();

            model.Entries = entries;

            model.View = uv;

            return model;
        }

        public ExpandoObject Post(Context ctx, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
