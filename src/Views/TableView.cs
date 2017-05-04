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

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            // Использовать вильтр UV
            model.Entries = userDb.Tests.ToArray();

            model.Titles = db.UVFields.ToList();

            model.MenuEls = new List<ExpandoObject>();
            model.MenuEls[0].Name = "Cущность 1";
            model.MenuEls[0].Link = "../nav";
            
 
            model.View = uv;

            return model;
        }
    }
}
