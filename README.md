# arinova.co.za

Static site for Acqua Rinova Group. No build step.

## Deploy to GitHub Pages
1. Push the contents of this folder to the root of a repository.
2. Settings > Pages > Deploy from branch > main, / (root).
3. The CNAME file sets the custom domain to arinova.co.za. At your DNS host, point the apex domain to GitHub Pages (A records 185.199.108.153, .109.153, .110.153, .111.153) and add a CNAME for www to <your-github-username>.github.io. Then tick "Enforce HTTPS".

## Brief used to build this site
Company name: Acqua Rinova Group (Pty) Ltd, Johannesburg, est. 2026
Domain: arinova.co.za
Positioning: The intelligence beneath every drop.
Product: water intelligence for mines and farms in shared catchments; Blue Harvest Projects (mine water to agriculture, Rows and Roots discovery tool); Acqua Nexus (water decision-making tool, in development)
Buyers: mining houses, commercial agriculture, lenders/insurers/DFIs, community and SLP teams
Problem and why now: El Niño 2026/27 guidance (NOAA, FEWS NET, WMO, FAO, as at June 2026)
Commercial case: Blue Harvest programme evidence base (1,200 ha assessed, climate modelling to 2050, 600 m3/h dewatering target). Buyer benefit figures: TO BE SUPPLIED
Leadership: Ronell van Staden, MJ Damhuis
Palette: provisional, dark base #0F1E24 with ochre accent #D9A84E
Assets: none yet
Call to action: book a one-hour discovery briefing (email TO BE SUPPLIED)

## Adding a hero photograph
Save it as /assets/hero.jpg and set `--hero-image: url("/assets/hero.jpg");` at the top of styles.css.

## Adding an article
Copy blog/post-template.html, follow the comment at the top of the file.
