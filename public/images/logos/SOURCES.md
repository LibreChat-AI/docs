# Community logo sources

The homepage uses transparent brand artwork with optical size limits, 60% opacity
at rest, full opacity on hover, and separate light/dark variants where needed.
Existing Shopify, Daimler Truck, Boston University, ClickHouse, and Stripe assets
are retained.

| Organization           | Source                                                                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NASA                   | [Official NASA SVG](https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg)                                                                                                                                  |
| BeiGene                | [Historical 2021 logo on Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:BeiGene_logo_(2021).png>)                                                                                                                |
| UC Berkeley            | [Official blue wordmark](https://www.berkeley.edu/wp-content/themes/berkeleygateway/img/logo-berkeley.svg?v=3), [gold wordmark](https://www.berkeley.edu/wp-content/themes/berkeleygateway/img/logo-berkeley-gold.svg?v=3)    |
| Harvard University     | Horizontal logo variants embedded in the [official stylesheet](https://www.harvard.edu/wp-content/themes/core/assets/css/dist/theme/master.min.css)                                                                           |
| Strategy               | [CompaniesLogo source and variants](https://companieslogo.com/microstrategy/logo/)                                                                                                                                            |
| SIXT                   | [2023 logo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sixt_Logo_2023.svg)                                                                                                                                  |
| Opendoor               | Desktop wordmark embedded in the [official homepage](https://www.opendoor.com/)                                                                                                                                               |
| UMass Amherst          | [Shortform wordmark on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:UMass_Amherst_Shortform_Wordmark.svg), sourced from University Relations                                                                    |
| Hinge Health           | [Official Contentful asset](https://images.ctfassets.net/hjcv6wdwxsdz/7M2bRDJrfnseMjP87h67Id/4a04655ee954c5d817cd02baf0e5d15a/Hinge_Health_Logo_Horizontal.svg)                                                               |
| Stanford University    | [Athletics block S on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Stanford_Cardinal_logo.svg), sourced from official athletics materials                                                                       |
| Université de Montréal | Blue and white SVGs embedded in the [official stylesheet](https://www.umontreal.ca/typo3temp/udemlessc/lessphp_9477013ded911f281ce354ea476ce0ead34a363a.css?1769692499)                                                       |
| Coinbase               | [CompaniesLogo source and variants](https://companieslogo.com/coinbase/logo/)                                                                                                                                                 |
| TDK                    | [Corporate logo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:TDK_logo.svg)                                                                                                                                   |
| cBioPortal             | [Official 2024 brand asset package](https://github.com/cBioPortal/cbioportal-frontend/blob/master/brand_assets/cBioPortalLogo2024.zip)                                                                                        |
| Lennar                 | [Official blue wordmark](https://investors.lennar.com/~/media/Images/L/Lennar-IR-V3/logo/lennar-logo-blue.svg?iar=0), [white wordmark](https://investors.lennar.com/~/media/Images/L/Lennar-IR-V3/logo/lennar-logo-white.svg) |
| Tekion                 | [Official header wordmark](https://cdn.prod.website-files.com/685291c1265e608fdfed1a69/69b3456536a5e9e0c69505dd_851fa9e68473074811d3371c9cfa789a_illustrations.svg), linked from [tekion.com](https://tekion.com/)            |
| Visa                   | White footer SVG and brand blue from the [official US homepage](https://usa.visa.com/)                                                                                                                                        |

BeiGene retains the historical identity shown in the supplied reference.
Its dark variant changes only neutral lettering to white, preserving the red
symbol and transparency. SIXT and Opendoor use white lettering in dark mode;
UMass Amherst and Hinge Health use white artwork. These theme variants preserve
the source shapes. NASA and Stanford use the same color asset in both themes.

TDK uses its blue artwork in light mode and a white variant in dark mode; unused
editor definitions were removed without changing the paths. Lennar uses its
official blue and white variants. cBioPortal and Tekion retain their original
colors in both themes. Visa uses the supplied white artwork in dark mode and
the official brand blue in light mode; its viewBox is expanded vertically to
avoid clipping the source path.

The scrolling component is adapted from [Magic UI Marquee](https://magicui.design/docs/components/marquee).
Its MIT license is retained in `components/ui/marquee.tsx`.
