namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;

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

        public ExpandoObject Get(DatabaseContext db, DBQuery userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            // Использовать фильтр UV
            dynamic dbmodel = new ExpandoObject();
            dbmodel.Entries = db.Entities.Where(e =>
                db.UVEntities.Where(uve =>
                    uve.EntityId == e.Id &&
                    uve.UserViewId == uv.Id
                ).Any()
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
            
            const string quote = "\"";
            const string sl = "\\";

            string[,] strs = new string[,] {};
            for(int i = 0; i < dbmodel.Entries[0].Fields.Count; i++) {
                strs[i,0] = dbmodel.Entries[0].Fields[i].Name;
                strs[i,1] = string.Join(null, sl, quote, strs[i,0], sl, quote);
            }

            model.Entries = userDb.Query(dbmodel.Entries[0].Entity.Name, strs, "");

            /*
            model.Entries = userDb.Query("Tests", new[]
                    {
                        Tuple.Create("Name", "\"Name\""),
                        Tuple.Create("Count", "\"Count\""),
                        Tuple.Create("Description", "\"Description\""),
                        Tuple.Create("Param1", "\"Param1\""),
                        Tuple.Create("Param2", "\"Param2\""),
                    }, ""
            );
             */

            model.Titles = db.UVFields.Where(uvf =>
                uvf.UserViewId == uv.Id
            ).ToList();
 
            model.View = uv;

            return model;
        }
    }
}
