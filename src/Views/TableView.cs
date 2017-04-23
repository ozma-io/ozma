namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;

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
            
            model.Entries = userDb.Tests.ToArray();
            model.View = uv;

            return model;
        }
    }
}
