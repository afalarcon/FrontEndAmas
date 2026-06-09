using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Amas.Application.Common;

internal static partial class SlugHelper
{
    public static string From(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return NonSlugCharacters().Replace(builder.ToString().Normalize(NormalizationForm.FormC), "-").Trim('-');
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugCharacters();
}
