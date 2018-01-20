namespace FunWithFlags.FunApp
{
    using Nancy.ViewEngines;
    using NGettext;

    public static class LiquidFilter
    {
        public static string Getstring(DotLiquid.Context ctx, string input)
        {
            var context = ctx.Registers.Get<IRenderContext>("nancy");
            object catalogOut;
            if (!context.Context.Items.TryGetValue("catalog", out catalogOut))
            {
                return input;
            }
            else
            {
                var catalog = (ICatalog) catalogOut;
                return catalog.GetString(input);
            }
        }

        public static string Url(DotLiquid.Context ctx, string url)
        {
            var context = ctx.Registers.Get<IRenderContext>("nancy");
            return context.ParsePath(url);
        }
    }
}
