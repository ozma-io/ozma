namespace FunWithFlags.FunApp.Views
{
    using System;
    using System.Dynamic;
    using System.Linq;
    using System.Collections.Generic;
    using Nancy;

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

        public ExpandoObject Get(DBQuery dbQuery, UserView uv, DynamicDictionary getPars)
        {
            dynamic model = new ExpandoObject();
            
            model.View = uv;

            return model;
        }

        public ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars)
        {
            throw new NotImplementedException("FormView Post is not implemented");
        }       
    }
}
