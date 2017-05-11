namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;
    using Nancy;

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

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, DynamicDictionary getPars)
        {
            var db = dbQuery.Database;
            dynamic model = new ExpandoObject();

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
                    UVFields = uvf.Where(tf =>
                        tf.EntityId == ent.Id
                    ).ToList()
                }
            ).ToList();
            
            
            /* 
            ).GroupJoin(db.Fields,
                ent => ent.Id,
                fld => fld.EntityId,
                (ent, fld) => new {
                    Entity = ent,
                    Fields = fld.Where(tf =>
                        tf.EntityId == ent.Id
                    ).ToList()
                }
            ).ToList();
            */

            var strs = dbmodel[0].Fields.Select(f => $"\"{f.Name}\"");

            model.Entries = dbQuery.Query(dbmodel[0].Entity.Name, strs);

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

            model.Titles = db.UVFields.Where(uvf =>
                uvf.UserViewId == uv.Id
            ).ToList();
 
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("TableView Post is not implemented");
        }       
    }
}
