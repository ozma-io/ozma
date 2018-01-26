namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Globalization;
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

    public class CalendarView : IView
    {
        public static double DateTimeToUnixTimestamp(DateTime dateTime)
        {
            return (TimeZoneInfo.ConvertTimeToUtc(dateTime) -
                    new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc)).TotalSeconds;
        }

        public ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;

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

            var entries = result.Rows.Select(row =>
                    {
                        var id = row.Cells[0].Value.GetInt();
                        var entryText = row.Cells[1].ToString();
                        return row.Cells.Skip(1).Zip(columns, (cell, col) => new
                            {
                                // JavaScript expects milliseconds since the epoch.
                                Value = cell.Value.IsDate ? (DateTimeToUnixTimestamp(cell.Value.GetDate()) * 1000).ToString(CultureInfo.InvariantCulture) : cell.Value.ToString(),
                                Duration = 1,
                                Id = id,
                                EntryText = entryText
                            }).ToList();
                    }).ToList();

            var model = new Dictionary<string, object>()
                { { "ColorCalendarBd", db.Settings.Single(s => s.Name == "ColorCalendarBd").Value },
                  { "ColorCalendarEntryBg", db.Settings.Single(s => s.Name == "ColorCalendarEntryBg").Value },
                  { "ColorCalendarNoteBg", db.Settings.Single(s => s.Name == "ColorCalendarNoteBg").Value },
                  { "ColorCalendarHeadBg", db.Settings.Single(s => s.Name == "ColorCalendarHeadBg").Value },
                  { "ColorCalendarBlockBg", db.Settings.Single(s => s.Name == "ColorCalendarBlockBg").Value },
                  { "ColorCalendarToday", db.Settings.Single(s => s.Name == "ColorCalendarToday").Value },
                  { "Titles", columns },
                  { "Entries", entries }
                };

            return new ViewPage { Name = "calendar", Attributes = model, Menus = new ViewMenu[] {} };
        }

        public ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars)
        {
            throw new NotImplementedException("CalendarView Post is not implemented");
        }       
    }
}
