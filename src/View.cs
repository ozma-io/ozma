namespace FunWithFlags.FunApp
{
    using System.Dynamic;
    
    using FunWithFlags.FunCore;

    public enum ViewType {Single, Multiple, None}; 

    public interface View
    {
        string ViewName
        {
            get;
        }

        ViewType ViewType
        {
            get;
        }

        ExpandoObject Get(DatabaseContext db, UserDatabaseContext userDb, UserView uv);
    }
}
