namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;

    using FunWithFlags.FunCore;

    public class FormView : View
    {
        public string ViewName
        {
            get { return "Form"; }
        }

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            model.View = uv;

            return model;
        }
    }
}
