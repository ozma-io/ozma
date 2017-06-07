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

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, dynamic getPars)
        {
            var db = dbQuery.Database;
            dynamic model = new ExpandoObject();

            model.Color = db.Settings.Single(s => s.Name == "bgcolor").Value;

            model.Titles = db.UVFields.Where(uvf =>
                uvf.UserViewId == uv.Id
            ).OrderBy(t => t.OrdNum).ToList();

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

            var strs = dbmodel[0].UVFields.Select(f => $"\"{f.Field.Name}\"");

            model.Entries = dbQuery.Query(dbmodel[0].Entity.Name, strs).Select(l =>
                l.Select((a,i) => new
                    {
                        Value = a,
                        Width = model.Titles[i].Width,
                        Height = uv.Height
                    }
                )
            );

            /*
            model.Entries = dbQuery.Query("Tests", new[]
                    {
                        "\"Name\"",
                        "\"Count\"",
                        "\"Description\"",
                        "\"Param1\"",
                        "\"Param2\"",
                    }, ""
            );
            */
 
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
