# ADR 0098: Device choices identify the model and release year

- Status: Accepted
- Date: 2026-11-19

Combined names such as “Kindle 11/2026” or “Kindle Paperwhite 3/4/Oasis” ask people to understand the converter's profile codes. A Kindle bought in 2024 can also be either an 11th-generation basic Kindle or a 12th-generation Paperwhite.

The desktop app offers each supported commercial model separately, with its release year and the generation where identified by the manufacturer. Basic Kindle names put the generation first; named families put the year and generation after the commercial name. Generation words and punctuation follow the app language. Generic resolution profiles retain the converter's names.

The app owns these names and stable selection IDs in `src/domain/device-models.ts`. It expands only profiles actually advertised by the bundled converter and inherits their screen geometry and capabilities. Equivalent models map to the same mangaprep profile at the conversion adapter boundary, in both planning and conversion. Device defaults use that same mapping. Screen processing and new conversion profiles remain mangaprep's responsibility.

The existing `deviceProfile` preference stores the selected model ID, including item overrides. Existing profile IDs remain valid choices for the first model of each group, so saved settings need no schema migration. A new alias retains its identity after reopening; selecting a basic Kindle from 2024 must not change its label to the 2022 model. Older app versions cannot recognize new aliases and retain their existing unavailable-profile fallback behavior.

Names were checked against Amazon's [device identification](https://digprjsurvey.amazon.com/csad/help/node/Tnx3eeuXDtZL0Q91ms) and [manuals](https://digprjsurvey.amazon.com/csad/help/node/G7N7RPHV2SW8CKBW), Kobo's [supported models](https://help.kobo.com/hc/en-us/articles/360019127133-Supported-eReader-models), the [Elipsa 2E specifications](https://ereader.kobo.com/es-es/products/kobo-elipsa-2e) and [Touch 2.0 announcement](https://www.kobo.com/blog/https-news.kobo.com-kobo-touch-2-0-the-next-generation-of-a-fan-favourite). These establish the model identities; the pinned converter remains the source of conversion capabilities. Future additions require checking both.

This catalog is planned for the next minor, 0.2.0. Aura Edition 2, Aura H2O Edition 2 and reMarkable Paper Pure need separately verified conversion profiles before appearing as supported choices. Similar names or nominal screen sizes alone are insufficient to map them.
