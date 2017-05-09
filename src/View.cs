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

        ExpandoObject Get(DatabaseContext db, DBQuery userDb, UserView uv);
    }
}
