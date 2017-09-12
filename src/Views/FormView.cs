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

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, dynamic getPars)
        {
            var db = dbQuery.Database;
            var recId = (int)getPars.recId;
            if (recId == 0)
            {
                recId = 1;
            };
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            var dbmodel = db.Entities.Where(e =>
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
                UVFields = old_model.UVFields.Where(tuvf => tuvf.UserViewId == uv.Id).OrderBy(t => t.OrdNum).ToList()
            }).Single();

            model.Titles = dbmodel.UVFields;
            // Дописано условие - что бы бралась только 1 запись по recId а не все записи
            var columnWhere = new Column(Table.FromEntity(dbmodel.Entity), "Id");
            var query = SelectExpr.Single(Table.FromEntity(dbmodel.Entity), dbmodel.UVFields.Select(f => f.Field.Name), CondExpr.NewCEq(CondExpr.NewCColumn(columnWhere), CondExpr.NewCInt(recId)));
            // Это здесь было
            var Entries = dbQuery.Query(query).Select(l =>
               l.Select((a, i) => new
               {
                   //sergeev changed
                   // дописать параметр - тип поля
                   Name = model.Titles[i].Name,
                   Cols = 40,//model.Titles[i].Size,
                   //Rows = iif((a.Length / 40 + 1),5, (a.Length / 40 + 1)),
                   Rows = (a.Length / 40 + 1 > 5) ? 5 : a.Length / 40 + 1,
                   Width = model.Titles[i].Width,
                   Heigth = uv.Height,
                   BlockNum= model.Titles[i].BlockNum,
                   OrdInBlock= model.Titles[i].OrdInBlock,
                   Value = a
                   //
               }
               )
           );
            /*for (int i = 0; i < entries.Count(); i++)
            {
                if (entries[i].Rows > 7)
                {
                    entries[i].Rows = 7;
                }
            }*/
            /*for (int i = 0; i < entries.Count(); i++)
            {
                for (int j = 0; j < entries[i].Count(); j++)
                
                    if (model.Titles[i].Type == "lookup")
                {
                    //entries.Value[i] = "FunFun";

                };
            };*/
            var count= Entries.Count();
            //var l = Entries
            var smt = Entries.ToList();
            
            model.Entries = Entries;
            //iif((a.Length / 40 + 1) > 7, 7, (a.Length / 40 + 1)),
            // это из старой Table
            /*   model.Entries =// SelectExpr.Single(Table.FromEntity(dbmodel.Entity), dbmodel.UVFields.Select(f => f.Field.Name));
             (query, new[]
                  {
                      "\"FieldId\"",
                      "\"Name\"",
                      "\"OrderNum\"",
                      "\"Width\"",
                   }, "\"Id=1\""
          );*/

            model.View = uv;
            /*var nm = model.Titles[0].Name;
            var nm1 = model.Titles[1].Name;
            var wd =  model.Titles[0].Width;
            var wd1 = model.Titles[1].Width;*/
            //var nm = model.Values[1].Name;
            // var vl = model.Entries.
            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("FormView Post is not implemented");
        }       
    }
}
