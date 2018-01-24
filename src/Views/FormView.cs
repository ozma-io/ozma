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
    using FunWithFlags.FunDB.View;
    using static FunWithFlags.FunDB.FunQL.AST;
    using FieldExpr = FunWithFlags.FunDB.FunQL.AST.FieldExpr<FunWithFlags.FunDB.FunQL.AST.FieldName>;
    using QualifiedValue = FunWithFlags.FunDB.SQL.AST.Value<FunWithFlags.FunDB.SQL.AST.ObjectRef>;
    using EntityName = FunWithFlags.FunDB.FunQL.AST.EntityName;
    using FieldName = FunWithFlags.FunDB.FunQL.AST.FieldName;

    public class FormView : IView
    {
        // FIXME: NO! Generation of HTML in code is a very dangerous anti-pattern.
        public string GetHtmlFieldTag(ViewColumn col, int cols, int rows, ViewCell value, IEnumerable<Tuple<int, ViewCell>> summaries)
        {
            string HtmlFieldTag;
            // FIXME: Will break for computed fields!
            var field = col.Field.TryColumnField();
            if (field.FieldType.IsDate)
            {
                DateTime dt = value.Value.GetDate();
                HtmlFieldTag = $"<input type=date name='{col.Name}' value='{(dt.ToString("yyyy-MM-dd"))}' />";
            }
            else if (field.FieldType.IsInt)
            {
                HtmlFieldTag = $"<input type=number name='{col.Name}' value='{value}' />";
            }
            else if (field.FieldType.IsReference)
            {
                HtmlFieldTag = $"<select name='{col.Name}'>";
                int? valueId = null;
                if (value.Value.IsInt)
                {
                    valueId = value.Value.GetInt();
                }
                foreach (var (lstId, lstVal) in summaries)
                {
                    //Заменяем двойные и одинарные кавычки, перенос строки для javascript
                    // FIXME: ESPECIALLY this!
                    string val = lstVal.ToString().Replace("\"", "!##!").Replace("'", "\'").Replace("\r\n", "\\r\\n");
                    HtmlFieldTag = HtmlFieldTag + $"<option {(valueId.HasValue && valueId.Value == lstId ? "selected" : "")} value='{lstId}' >{val}</option>";
                }
                if (field.Field.Nullable)
                {
                    HtmlFieldTag = HtmlFieldTag + $"<option {(value.Value.IsNull ? "selected" : "")} value='' ></option>";
                }
                HtmlFieldTag = HtmlFieldTag + "</select>";
            }
            else if (field.FieldType.IsEnum)
            {
                HtmlFieldTag = $"<select name='{col.Name}'>";
                foreach (string lstVal in field.FieldType.GetEnum())
                {
                    //Заменяем двойные и одинарные кавычки, перенос строки для javascript
                    // FIXME: ESPECIALLY this!
                    string val = lstVal.Replace("\"", "!##!").Replace("'", "\'").Replace("\r\n", "\\r\\n");
                    HtmlFieldTag = HtmlFieldTag + $"<option {(value.ToString() == lstVal ? "selected" : "")} value='{val}' >{val}</option>";
                }
                if (field.Field.Nullable)
                {
                    HtmlFieldTag = HtmlFieldTag + $"<option {(value.Value.IsNull ? "selected" : "")} value='' ></option>";
                }
                HtmlFieldTag = HtmlFieldTag + "</select>";
            }
            else
            {
                //Заменяем двойные и одинарные кавычки, перенос строки для javascript
                // FIXME: ESPECIALLY this!
                string val = value.ToString().Replace("\"", "!##!").Replace("'", "\'").Replace("\r\n", "\\r\\n");
                HtmlFieldTag = $"<textarea name='{col.Name}' cols={cols} rows={rows} >{val}</textarea>";
            }
            return HtmlFieldTag;
        }

        public ViewResponse Get(Context ctx, ICatalog catalog, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;

            var model = new Dictionary<string, object>();
            model["ColorFormBd"] = db.Settings.Single(s => s.Name == "ColorFormBd").Value;

            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery;

            if (getPars.recId.HasValue && !getPars.recId.ToString().Contains(";"))
            {
                int recId;
                recId = (int)getPars.recId;
                var columnWhere = FieldExpr.NewFEEq(FieldExpr.NewFEColumn(new FieldName(null, "Id")), FieldExpr.NewFEValue(FieldValue.NewFInt(recId)));
                newQuery = newQuery.MergeWhere(columnWhere);
                var result = ctx.Resolver.RunQuery(newQuery);

                var row = result.Rows.Single();

                var columns = result.Columns.Select(col =>
                        {
                            Tuple<int, ViewCell>[] summaries = null;
                            if (col.Field != null)
                            {
                                var colField = col.Field.TryColumnField();
                                if (colField != null && colField.FieldType.IsReference)
                                {
                                    summaries = ctx.Resolver.SelectSummaries(colField.FieldType.GetReference().Entity);
                                }
                            }

                            return new
                            {
                                Column = col,
                                Caption = col.Attributes.GetStringWithDefault(col.Name, "Caption"),
                                Width = col.Attributes.GetIntWithDefault(100, "Size", "Width"),
                                BlockNum = col.Attributes.GetIntWithDefault(0, "Form", "BlockNum"),
                                OrdInBlock = col.Attributes.GetIntWithDefault(0, "Form", "OrdInBlock"),
                                Summaries = summaries
                            };
                        }).ToList();

                var entries = row.Cells.Zip(columns, (cell, col) =>
                        {
                            var cellPun = cell.ToString();
                            // FIXME: Subqueries don't have Fields!
                            var field = col.Column.Field.TryColumnField();
                            return new
                            {
                                Name = col.Caption,
                                BlockNum = col.BlockNum,
                                OrdInBlock = col.OrdInBlock,
                                Width = col.Width,
                                Cols = 40,
                                Rows = (cellPun.Length / 40 + 1 > 5) ? 5 : cellPun.Length / 40 + 1,
                                // FIXME: get from user view-scope attributes
                                Height = 20,
                                ListValues = field.FieldType.IsEnum ? field.FieldType.GetEnum() : null,
                                HtmlFieldTag = GetHtmlFieldTag(
                                                               col.Column,
                                                               40,
                                                               (cellPun.Length / 40 + 1 > 5) ? 5 : cellPun.Length / 40 + 1,
                                                               cell,
                                                               col.Summaries
                                                              ),
                                Value = cell
                            };
                        }).ToList();

                model["Entries1"] = entries.Where(cell => cell.BlockNum == 1).ToList();
                model["Entries2"] = entries.Where(cell => cell.BlockNum == 2).ToList();
                model["Entries3"] = entries.Where(cell => cell.BlockNum == 3).ToList();
                model["Entries4"] = entries.Where(cell => cell.BlockNum == 4).ToList();
            }
            else
            {
                var result = ctx.Resolver.GetTemplate(newQuery);
                var entries = result.Columns.Select(col =>
                        {
                            var cell = col.ToDefaultCell();
                            return new
                                {
                                    Name = col.Attributes.GetStringWithDefault(col.Field.Field.Name, "Caption"),
                                    Cols = 40,
                                    Rows = 1,
                                    Width = col.Attributes.GetIntWithDefault(100, "Size", "Width"),
                                    // FIXME: get from user view-scope attributes
                                    Height = 20,
                                    BlockNum = col.Attributes.GetIntWithDefault(0, "Form", "BlockNum"),
                                    OrdInBlock = col.Attributes.GetIntWithDefault(0, "Form", "OrdInBlock"),
                                    // FIXME: Subqueries don't have Fields!
                                    ListValues = col.Field.FieldType.IsEnum ? col.Field.FieldType.GetEnum() : null,
                                    HtmlFieldTag = GetHtmlFieldTag(
                                                                   col.ToViewColumn(),
                                                                   40,
                                                                   1,
                                                                   cell,
                                                                   col.Summaries
                                                                   ),
                                    Value = cell
                                };
                        }).ToList();

                // FIXME: ineffective!
                model["Entries1"] = entries.Where(cell => cell.BlockNum == 1).ToList();
                model["Entries2"] = entries.Where(cell => cell.BlockNum == 2).ToList();
                model["Entries3"] = entries.Where(cell => cell.BlockNum == 3).ToList();
                model["Entries4"] = entries.Where(cell => cell.BlockNum == 3).ToList();
            }

            var removeRequest = catalog.GetString("Do you want to remove the item?");
            var menu = new ViewMenu[] 
                {
                new ViewMenu
                    {
                        Name = catalog.GetString("Actions"),
                        Items = new ViewMenuItem[] {
                        new ViewMenuItem {
                            Name = catalog.GetString("Save"),
                            Url = "javascript: document.form.action.value='save'; document.form.submit();"
                        },
                        new ViewMenuItem {
                            Name = catalog.GetString("Remove"),
                            Url = $"javascript: document.form.action.value='delete'; if (confirm('{removeRequest}')) document.form.submit();"
                        }
                    }
                }
            };

            return new ViewPage { Name = "form", Attributes = model, Menus = menu };
        }

        public ViewResponse Post(Context ctx, ICatalog catalog, UserView uv, dynamic getPars, dynamic postPars)
        {
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var redirectName = parsedQuery.Attributes.GetStringWithDefault(null, "ParentView");
            var redirectUv = ctx.Database.UserViews.Single(cuv => cuv.Name == redirectName);
            string gP;
            List<string> gl;
            gP = getPars.recId.ToString();
            string [] recs;
            recs = gP.Split(new Char[] { ';' });
            var pPars = new Dictionary<string, string>();
            foreach (var k in (DynamicDictionary)postPars)
            {
                if (k != "action")
                {
                    if (recs.Count() > 1)
                    {
                        if (postPars[k].Value != "")
                        {
                            pPars.Add(k, postPars[k]);
                        }
                    }
                    else
                    {
                        pPars.Add(k, postPars[k]);
                    }
                }
            };
            var action = ((string)postPars.action).ToLower();
            if (action == "save" && !getPars.recId.HasValue)
            {
                ctx.Resolver.InsertEntry(parsedQuery, pPars);
            }
            else if (action == "save" && getPars.recId.HasValue)
            {
                foreach (string updId in recs)
                {
                    ctx.Resolver.UpdateEntry(parsedQuery, Int32.Parse(updId), pPars);
                }
            }
            else if (action == "delete")
            {
                foreach (string delId in recs)
                {
                    ctx.Resolver.DeleteEntry(parsedQuery, Int32.Parse(delId));
                }
            }
            else
            {
                throw new ArgumentException($"Unknown action: {action}");
            }

            return new ViewRedirect { Url = $"~/uv/{redirectUv.Id}" };
        }
    }
}
