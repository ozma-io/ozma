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
                    //var str = "list;lookup;string;date";
                    List<string> lst = new List<string>(listValues.Split(';'));
                    HtmlFieldTag = "<select>";
                    foreach (string lstVal in lst)
                    {
                        HtmlFieldTag = HtmlFieldTag + "<option " + ((value == lstVal) ? "selected value=": "value=") + lstVal + " > "+ lstVal + "</option>";
                    }
                    HtmlFieldTag = HtmlFieldTag + "<select>";
                    break;
                default:
                    HtmlFieldTag = "<textarea cols=" + cols.ToString() + " rows=" + rows.ToString() + ">" + value + "</textarea>";
                    break;
            };
            return HtmlFieldTag;
        }

        public dynamic GetEntries(DBQuery dbQuery, UserView uv, dynamic getPars, int blockNum)
        {
            var db = dbQuery.Database;
            var recId = (int)getPars.recId;
            //var dbmodel1 = db.Entities.Where(e =>
            var dbmodel = db.Entities.Include(ent => ent.Schema).Where(e =>
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
               UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id && tuvf.BlockNum == blockNum).OrderBy(t => t.OrdInBlock).ToList()
           }).Single();

             // Дописано условие - что бы бралась только 1 запись по recId а не все записи
            var columnWhere = new Column(Table.FromEntity(dbmodel.Entity), "Id");
            var query = SelectExpr.Single(Table.FromEntity(dbmodel.Entity), dbmodel.UVFields.Select(f => f.Field.Name), CondExpr.NewCEq(CondExpr.NewCColumn(columnWhere), CondExpr.NewCInt(recId)));

            var Entries = dbQuery.Query(query).Select(l =>
               l.Select((a, i) => new
               {
                   Name = dbmodel.UVFields[i].Name,
                   Cols = 40,
                   Rows = (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                   Width = dbmodel.UVFields[i].Width,
                   Heigth = uv.Height,
                   BlockNum = dbmodel.UVFields[i].BlockNum,
                   OrdInBlock = dbmodel.UVFields[i].OrdInBlock,
                   BusinessType = dbmodel.UVFields[i].Field.BusinessType,
                   ListValues = dbmodel.UVFields[i].Field.ListValues,
                   HtmlFieldTag = GetHtmlFieldTag(
                       dbmodel.UVFields[i].Field.BusinessType,
                       40,
                       (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                       a,
                       dbmodel.UVFields[i].Field.ListValues
                       ),
                   Value = a
               }
               )
             );
            var cnt = Entries.Count();
            db.Database.CloseConnection();
            return Entries;
        }

        public dynamic GetEntriesDefault(DBQuery dbQuery, UserView uv, dynamic getPars, int blockNum)
        {
            var db = dbQuery.Database;
            var recId = (int)getPars.recId;
            //var dbmodel1 = db.Entities.Where(e =>
            var dbmodel = db.Entities.Include(ent => ent.Schema).Where(e =>
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
               UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id && tuvf.BlockNum == blockNum).OrderBy(t => t.OrdInBlock).ToList()
           }).Single();

            // Дописано условие - что бы бралась только 1 запись по recId а не все записи
            var columnWhere = new Column(Table.FromEntity(dbmodel.Entity), "Id");
            var query = SelectExpr.Single(Table.FromEntity(dbmodel.Entity), dbmodel.UVFields.Select(f => f.Field.Name), CondExpr.NewCEq(CondExpr.NewCColumn(columnWhere), CondExpr.NewCInt(recId)));

            var Entries = dbQuery.Query(query).Select(l =>
               l.Select((a, i) => new
               {
                   Name = dbmodel.UVFields[i].Name,
                   Cols = 40,
                   Rows = (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                   Width = dbmodel.UVFields[i].Width,
                   Heigth = uv.Height,
                   BlockNum = dbmodel.UVFields[i].BlockNum,
                   OrdInBlock = dbmodel.UVFields[i].OrdInBlock,
                   BusinessType = dbmodel.UVFields[i].Field.BusinessType,
                   ListValues = dbmodel.UVFields[i].Field.ListValues,
                   HtmlFieldTag = GetHtmlFieldTag(
                       dbmodel.UVFields[i].Field.BusinessType,
                       40,
                       (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                       a,
                       dbmodel.UVFields[i].Field.ListValues
                       ),
                   Value = a
               }
               )
             );
            var cnt = Entries.Count();
            db.Database.CloseConnection();
            return Entries;
        }

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, dynamic getPars)
        {
     
            var db = dbQuery.Database;
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

            //var Entries1 = GetEntries(dbQuery, uv, getPars, 1);
            model.Entries1 = GetEntries(dbQuery, uv, getPars, 1);
            model.Entries2 = GetEntries(dbQuery, uv, getPars, 2);
            model.Entries3 = GetEntries(dbQuery, uv, getPars, 3);
            model.Entries4 = GetEntries(dbQuery, uv, getPars, 4);
            
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

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("FormView Post is not implemented");
        }       
    }
}
