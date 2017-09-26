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
    using FunWithFlags.FunDB.View;
    using EntityName = FunWithFlags.FunDB.FunQL.AST.EntityName;
    using FieldName = FunWithFlags.FunDB.FunQL.AST.FieldName;
    using WhereExpr = FunWithFlags.FunDB.FunQL.AST.WhereExpr<FunWithFlags.FunDB.FunQL.AST.EntityName, FunWithFlags.FunDB.FunQL.AST.FieldName>;

    public class FormView : View
    {
        public string ViewName
        {
            get { return "Form"; }
        }

        public ViewType ViewType
        {
            get { return ViewType.Single; }
        }

        public string GetHtmlFieldTag(string businessType, int cols, int rows, string value, string listValues)
        {
            DateTime dt;
            string HtmlFieldTag;
            //Заменяем двойные и одинарные кавычки
            string val = value.Replace("\"", "!##!").Replace("'", "\'");
            
            switch (businessType)
            {
                case "date":
                    dt = DateTime.Parse(value);
                    HtmlFieldTag = "<input type=date value=" + dt.ToString("yyyy-MM-dd") + ">";
                    break;
                case "int":
                    HtmlFieldTag = "<input type=number value=" + value + ">";
                    break;
                case "list":
                    List<string> lst = new List<string>(listValues.Split(';'));
                    HtmlFieldTag = "<select>";
                    foreach (string lstVal in lst)
                    {
                        HtmlFieldTag = HtmlFieldTag + "<option " + ((value == lstVal) ? "selected value=": "value=") + lstVal + " > "+ lstVal + "</option>";
                    }
                    HtmlFieldTag = HtmlFieldTag + "<select>";
                    break;
                default:
                    HtmlFieldTag = "<textarea cols=" + cols.ToString() + " rows=" + rows.ToString()+">" + val + "</textarea>";
                    break;
            };
            return HtmlFieldTag;
        }
                
        public ExpandoObject Get(Context ctx, UserView uv, dynamic getPars)
        {
            var db = ctx.Database;
            /*var recId = (int)getPars.recId;
            if (recId == 0)
            {
                recId = 1;
            };
            */
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;
            // Формируем название страницы в браузере
            var entitiesQuery = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.UserViewId == uv.Id && uve.EntityId == e.Id
                ).Any()
            );
            model.FormName = entitiesQuery.First().DisplayName;

            var recId = (int)getPars.recId;
             // Дописано условие - что бы бралась только 1 запись по recId а не все записи
            var columnWhere = WhereExpr.NewWEq(WhereExpr.NewWField(new FieldName(null, "Id")), WhereExpr.NewWInt(recId));
            var parsedQuery = ViewResolver.ParseQuery(uv);
            var newQuery = parsedQuery.MergeWhere(columnWhere);
            var result = ctx.Resolver.RunQuery(newQuery);
            var row = result.Rows[0];

            var Entries = row.Cells.Zip(result.Columns, (cell, col) => new
               {
                   Name = col.Attributes.GetStringWithDefault(col.Name, "Caption"),
                   Cols = 40,
                   Rows = (cell.Length / 40 + 1 > 5) ? 5 : cell.Length / 40 + 1,
                   Width = col.Attributes.GetIntWithDefault(100, "Size", "Width"),
                   // FIXME: get from user view-scope attributes
                   Height = 20,
                   BlockNum = col.Attributes.GetIntWithDefault(0, "Form", "BlockNum"),
                   OrdInBlock = col.Attributes.GetIntWithDefault(0, "Form", "OrdInBlock"),
                   // FIXME: Subqueries don't have Fields!
                   BusinessType = col.Field.BusinessType,
                   ListValues = col.Field.ListValues,
                   HtmlFieldTag = GetHtmlFieldTag(
                       col.Field.BusinessType,
                       40,
                       (cell.Length / 40 + 1 > 5) ? 5 : cell.Length / 40 + 1,
                       cell,
                       col.Field.ListValues
                       ),
                   Value = cell
               });

            //var Entries1 = GetEntries(ctx, uv, getPars, 1);
            model.Entries1 = Entries.Where(cell => cell.BlockNum == 1);
            model.Entries2 = Entries.Where(cell => cell.BlockNum == 2);
            model.Entries3 = Entries.Where(cell => cell.BlockNum == 3);
            model.Entries4 = Entries.Where(cell => cell.BlockNum == 4);
            
            /*
            // Поля для блока 1
            var dbmodel1 = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.EntityId == e.Id &&
                    uve.UserViewId == uv.Id
                ).Any()
            ).GroupJoin(db.UVFields.Include(tuvf => tuvf.Field),
                ent => ent.Id,
                uvf => uvf.Field.EntityId,
                (ent, uvf) => new
                {
                    Entity = ent,
                    UVFields = uvf.ToList()
                }
            // FIXME: Workaround for https://github.com/aspnet/EntityFrameworkCore/issues/9609
            // We filter and sort UVFields after they are fetched with EFCore.
            ).ToList().Select(old_model => new
            {
                Entity = old_model.Entity,
                UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id && tuvf.BlockNum == 1).OrderBy(t => t.OrdInBlock).ToList()
            }).Single();

            model.Titles1 = dbmodel1.UVFields;
            //model.Blocks.Add(dbmodel.UVFields);
            // Дописано условие - что бы бралась только 1 запись по recId а не все записи
            var columnWhere1 = new Column(Table.FromEntity(dbmodel1.Entity), "Id");
            var query1 = SelectExpr.Single(Table.FromEntity(dbmodel1.Entity), dbmodel1.UVFields.Select(f => f.Field.Name), CondExpr.NewCEq(CondExpr.NewCColumn(columnWhere1), CondExpr.NewCInt(recId)));

            var Entries1 = dbQuery.Query(query1).Select(l =>
               l.Select((a, i) => new
               {
                   Name = dbmodel1.UVFields[i].Name,
                   Cols = 40,
                   Rows = (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                   Width = dbmodel1.UVFields[i].Width,
                   Heigth = uv.Height,
                   BlockNum= dbmodel1.UVFields[i].BlockNum,
                   OrdInBlock = dbmodel1.UVFields[i].OrdInBlock,
                   Value = a
               }
               )
           );
            model.Entries1 = Entries1;
            */
            /* // Поля для блока 2
             var dbmodel2 = db.Entities.Where(e =>
                 db.UVEntities.Where(uve =>
                     uve.EntityId == e.Id &&
                     uve.UserViewId == uv.Id
                 ).Any()
             ).GroupJoin(db.UVFields.Include(tuvf => tuvf.Field),
                 ent => ent.Id,
                 uvf => uvf.Field.EntityId,
                 (ent, uvf) => new
                 {
                     Entity = ent,
                     UVFields = uvf.ToList()
                 }
             // FIXME: Workaround for https://github.com/aspnet/EntityFrameworkCore/issues/9609
             // We filter and sort UVFields after they are fetched with EFCore.
             ).ToList().Select(old_model => new
             {
                 Entity = old_model.Entity,
                 UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id && tuvf.BlockNum == 2).OrderBy(t => t.OrdInBlock).ToList()
             }).Single();

             model.Titles2 = dbmodel2.UVFields;
             //model.Blocks.Add(dbmodel.UVFields);
             // Дописано условие - что бы бралась только 1 запись по recId а не все записи
             var columnWhere2 = new Column(Table.FromEntity(dbmodel2.Entity), "Id");
             var query2 = SelectExpr.Single(Table.FromEntity(dbmodel1.Entity), dbmodel2.UVFields.Select(f => f.Field.Name), CondExpr.NewCEq(CondExpr.NewCColumn(columnWhere2), CondExpr.NewCInt(recId)));

             var Entries2 = dbQuery.Query(query2).Select(l =>
                l.Select((a, i) => new
                {
                    Name = dbmodel1.UVFields[i].Name,
                    Cols = 40,//model.Titles[i].Size,
                    Rows = (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                    Width = dbmodel1.UVFields[i].Width,
                    Heigth = uv.Height,
                    BlockNum = dbmodel1.UVFields[i].BlockNum,
                    OrdInBlock = dbmodel1.UVFields[i].OrdInBlock,
                    Value = a
                }
                )
            );
             //model.Blocks.Add((ExpandoObject)Entries);
             model.Entries2 = Entries2;
             */
            model.View = uv;
            return model;
        }

        public ExpandoObject Post(Context ctx, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("FormView Post is not implemented");
        }       
    }
}
