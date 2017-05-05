namespace FunWithFlags.FunApp.Views
{
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;

    using FunWithFlags.FunCore;

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

        public ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv)
        {
            dynamic model = new ExpandoObject();
            
            model.View = uv;

            return model;
        }
    }
}
