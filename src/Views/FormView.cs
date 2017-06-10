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
                (ent, uvf) => new {
                    Entity = ent,
                    UVFields = uvf.Where(tuvf =>
                        tuvf.UserViewId == uv.Id &&
                        tuvf.Field.EntityId == ent.Id
                    ).OrderBy(t => t.OrdNum).ToList()
                }
            ).ToList();

            model.Titles = dbmodel[0].UVFields.ToList();

            var strs = dbmodel[0].UVFields.Select(f => $"\"{f.Field.Name}\"");

            // Сюда дописать условие - что бы бралась только 1 запись по recId а не все записи
            model.Entries = dbQuery.Query(dbmodel[0].Entity.Name, strs, "Settings.Name = \"bgcolor\"").Select(l =>
                l.Select((a,i) => new
                    {
                        // дописать параметр - тип поля
                        Value = a,
                    }
                )
            );

            model.View = uv;

            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("FormView Post is not implemented");
        }       
    }
}
