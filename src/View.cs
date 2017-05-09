namespace FunWithFlags.FunApp
{
    using System.Dynamic;
    
    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB;

    public enum ViewType {Single, Multiple, None}; 

    public interface View
    {
        string ViewName { get; }

        ViewType ViewType { get; }

        // FIXME: Don't give DatabaseContext! Everything can be loaded from database during preparations.
        ExpandoObject Get(DatabaseContext db, DBQuery userDb, UserView uv, ExpandoObject getPars);
        ExpandoObject Post(DatabaseContext db, DBQuery userDb, UserView uv, ExpandoObject getPars, ExpandoObject postPars);
    }
}
