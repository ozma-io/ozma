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
            model.Entries = userDb.Query("Tests", new[]
                    {
                        Tuple.Create("Name", "\"Name\""),
                        Tuple.Create("Count", "\"Count\""),
                        Tuple.Create("Description", "\"Description\""),
                        Tuple.Create("Param1", "\"Param1\""),
                        Tuple.Create("Param2", "\"Param2\""),
                    }, "");

            model.Titles = db.UVFields.Where(uvf =>
                uvf.UserViewId == uv.Id
            ).ToList();
 
            model.View = uv;

            return model;
        }
    }
}
