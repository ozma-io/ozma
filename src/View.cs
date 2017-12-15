namespace FunWithFlags.FunApp
{
    using System.Dynamic;
    using Nancy;
    
    using FunWithFlags.FunCore;
    using FunWithFlags.FunDB.Context;

    public enum ViewType {Single, Multiple, None}; 

    public interface View
    {
        string ViewName { get; }

        ViewType ViewType { get; }

        // FIXME: Don't give DatabaseContext! Everything can be loaded from database during preparations.
        ExpandoObject Get(Context ctx, UserView uv, dynamic getPars);
        ExpandoObject Post(Context ctx, UserView uv, dynamic getPars, dynamic postPars);
    }
}
