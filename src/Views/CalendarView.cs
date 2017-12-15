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

    public class CalendarView : View
    {
        public string ViewName
        {
            get { return "CalendarM"; }
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
            model.ColorCalendarBd = db.Settings.Single(s => s.Name == "ColorCalendarBd").Value;
            model.ColorCalendarEntryBg = db.Settings.Single(s => s.Name == "ColorCalendarEntryBg").Value;
            model.ColorCalendarNoteBg = db.Settings.Single(s => s.Name == "ColorCalendarNoteBg").Value;
            model.ColorCalendarHeadBg = db.Settings.Single(s => s.Name == "ColorCalendarHeadBg").Value;
            model.ColorCalendarBlockBg = db.Settings.Single(s => s.Name == "ColorCalendarBlockBg").Value;
            model.ColorCalendarToday = db.Settings.Single(s => s.Name == "ColorCalendarToday").Value;

            // Формируем название страницы в браузере
            model.FormName = uv.DisplayName;

            var resultId = Tuple.Create(Result.NewRField(new FieldName(null, "Id")), new AttributeMap());
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeResults(new[] { resultId });
            var result = ctx.Resolver.RunQuery(newQuery);

            var columns = result.Columns.Skip(1).Select(col => new
                {
                    Field = col.Field,
                    Name = col.Name,
                    Width = col.Attributes.GetIntWithDefault(100, "Size", "Width").ToString() + "px"
                }).ToList();
            model.Titles = columns;

            var entries = result.Rows.Select(row =>
                    {
                        var id = row.Cells[0].Value.GetInt();
                        var entryText = row.Cells[1].ToString();
                        return row.Cells.Skip(1).Zip(columns, (cell, col) => new
                            {
                                Value = cell.ToString(),
                                Duration = 1,
                                Id = id,
                                EntryText = entryText
                            }).ToList();
                    }).ToList();

            model.Entries = entries;

            model.View = uv;

            return model;
        }

        public ExpandoObject Post(Context ctx, UserView uv, dynamic getPars, dynamic postPars)
        {
            throw new NotImplementedException("CalendarView Post is not implemented");
        }       
    }
}
