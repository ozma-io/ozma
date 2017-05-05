namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;

    using FunWithFlags.FunCore;

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

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            // Использовать фильтр UV
            model.Entries = userDb.Tests.ToArray();

            model.Titles = db.UVFields.ToList();
 
            model.View = uv;

            return model;
        }
    }
}
