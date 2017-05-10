namespace FunWithFlags.FunApp
{
    using System.Dynamic;
    using Nancy;
    
    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB;

    public enum ViewType {Single, Multiple, None}; 

    public interface View
    {
        string ViewName { get; }

        ViewType ViewType { get; }

        // FIXME: Don't give DatabaseContext! Everything can be loaded from database during preparations.
        ExpandoObject Get(DBQuery dbQuery, UserView uv, DynamicDictionary getPars);
        ExpandoObject Post(DBQuery dbQuery, UserView uv, DynamicDictionary getPars, DynamicDictionary postPars);
    }
}
