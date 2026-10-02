/* ==========================================================================
   PHOTOS
   This is the only file you edit to add, remove, or move photos.
   ==========================================================================

   HOW TO ADD A PHOTO
   1. Export two copies of the photo with the exact same filename:
        a small copy, about 600px on the long edge, goes in images/thumbs/
        a large copy, about 2000px on the long edge, goes in images/full/
   2. Copy any entry below, paste it on a new line inside the square
      brackets, and change the details.
   3. Save this file and refresh the page.

   HOW TO REMOVE A PHOTO
   Delete its line here. You can also delete its two image files.

   HOW TO MOVE A PHOTO TO ANOTHER CATEGORY
   Change its category (and subcategory, if it has one).

   WHAT EACH FIELD MEANS
   file         The filename, spelled exactly like the files in the images
                folders. Capital letters matter once the site is online:
                "Paris.jpg" and "paris.jpg" count as two different files.
                Avoid spaces in filenames.
   category     The bubble this photo belongs to, such as "Sessions",
                "Travel", or "Candids". Type a brand new name and a new
                bubble appears on its own. A bubble with no photos hides.
   subcategory  Optional. Use it for Sessions photos: "Grad" or "Engagement".
                Leave it out for every other photo.
   featured     true puts the photo in Featured and shows it a little larger.
                false keeps it out of Featured.
   alt          A short description of the photo for people using screen
                readers. Describe what is in it: "Couple laughing on a pier".
   width        Optional, together with height. The pixel size of the
   height       thumbnail. Filling these in lets the page skip a measuring
                step and load faster. Everything works without them.

   SMALL RULES THAT PREVENT ERRORS
   Every entry sits inside { } and ends with a comma.
   Text goes inside "double quotes". true and false do not.
   ========================================================================== */

const PHOTOS = [
  // Placeholder entries. Replace each with a real photo, then delete the samples
  // from images/full/ and images/thumbs/.
  { file: "annagrad6.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "grantgrad8.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "valleylake.JPG",           category: "Travel",   featured: false, alt: "Lake in a mountain valley" },
  { file: "grantgrad7.JPG",           category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "grantgrad1.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "postcards.JPG",            category: "Travel",   featured: false, alt: "Rack of postcards" },
  { file: "flowerdisplay.JPG",        category: "Travel",   featured: true, alt: "Flower display" },
  { file: "greenvalley(1).JPG",       category: "Travel",   featured: false, alt: "Green valley" },
  { file: "hotairballoon.JPG",        category: "Travel",   featured: false, alt: "Hot air balloon in the sky" },
  { file: "cliffside.JPG",            category: "Travel",   featured: true, alt: "Cliffside view" },
  { file: "lakemountainsunset.JPG",   category: "Travel",   featured: false, alt: "Sunset over a mountain lake" },
  { file: "grantgrad2.jpeg",          category: "Sessions", subcategory: "Grad", featured: true, alt: "Graduation portrait" },
  { file: "swissfountain.JPG",        category: "Travel",   featured: false, alt: "Fountain in Switzerland" },
  { file: "annagrad10.JPG",           category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "mountainhike.JPG",         category: "Travel",   featured: false, alt: "Mountain hiking trail" },
  { file: "annagrad11.JPG",           category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "mountainhike2.JPG",        category: "Travel",   featured: false, alt: "View from a mountain hike" },
  { file: "annagrad5.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "sunsettree.JPG",           category: "Travel",   featured: true, alt: "Tree against a sunset" },
  { file: "rockysnow.JPG",            category: "Travel",   featured: false, alt: "Snow on rocky peaks" },
  { file: "grantgrad5.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "benchview2.JPG",           category: "Travel",   featured: false, alt: "Bench overlooking a view" },
  { file: "annagrad12.JPG",           category: "Sessions", subcategory: "Grad", featured: true, alt: "Graduation portrait" },
  { file: "annagrad2.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "orangecoastsunset.JPG",    category: "Travel",   featured: true, alt: "Orange sunset over the coast" },
  { file: "cityoverview.JPG",         category: "Travel",   featured: false, alt: "Overlook of a city" },
  { file: "smallbird.JPG",            category: "Travel",   featured: false, alt: "Small bird" },
  { file: "goldarch.JPG",             category: "Travel",   featured: true, alt: "Gold arch" },
  { file: "camels.JPG",               category: "Travel",   featured: false, alt: "Camels" },
  { file: "grantgrad4.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "snowylake.JPG",            category: "Travel",   featured: false, alt: "Lake surrounded by snow" },
  { file: "lighthouse.JPG",           category: "Travel",   featured: false, alt: "Lighthouse" },
  { file: "swissflag.JPG",            category: "Travel",   featured: true, alt: "Swiss flag" },
  { file: "grantgrad9.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "swissvillage.JPG",         category: "Travel",   featured: false, alt: "Swiss village" },
  { file: "cow.JPG",                  category: "Travel",   featured: true, alt: "Cow in a pasture" },
  { file: "grantgrad3.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "cityoverviewzoom.JPG",     category: "Travel",   featured: false, alt: "Close view of city rooftops" },
  { file: "hotairballoons.JPG",       category: "Travel",   featured: true, alt: "Hot air balloons in the sky" },
  { file: "coastalvillage.JPG",       category: "Travel",   featured: false, alt: "Coastal village" },
  { file: "stones.JPG",               category: "Travel",   featured: false, alt: "Standing stones" },
  { file: "cozydining.JPG",           category: "Travel",   featured: false, alt: "Cozy dining room" },
  { file: "goldbuilding.JPG",         category: "Travel",   featured: false, alt: "Gold building facade" },
  { file: "moon.JPG",                 category: "Travel",   featured: false, alt: "Moon in the night sky" },
  { file: "castlewindow.JPG",         category: "Travel",   featured: false, alt: "View through a castle window" },
  { file: "annagrad9.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "lightdisplay.JPG",         category: "Travel",   featured: true, alt: "Light display" },
  { file: "glassdome.JPG",            category: "Travel",   featured: false, alt: "Glass dome" },
  { file: "artgallery.JPG",           category: "Travel",   featured: false, alt: "Art gallery interior" },
  { file: "annagrad3.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "kayakers.JPG",             category: "Travel",   featured: true, alt: "Kayakers on the water" },
  { file: "orblights.JPG",            category: "Travel",   featured: true, alt: "Glowing orb lights" },
  { file: "splitcliff.JPG",           category: "Travel",   featured: false, alt: "Split cliff" },
  { file: "annagrad8.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "yellowbalcony.JPG",        category: "Travel",   featured: false, alt: "Yellow balcony" },
  { file: "scenicbridge.JPG",         category: "Travel",   featured: false, alt: "Scenic bridge" },
  { file: "coritasunset.JPG",         category: "Travel",   featured: false, alt: "Sunset" },
  { file: "annagrad1.JPG",            category: "Sessions", subcategory: "Grad", featured: true, alt: "Graduation portrait" },
  { file: "greenvalley.JPG",          category: "Travel",   featured: false, alt: "Green valley" },
  { file: "benchview.JPG",            category: "Travel",   featured: false, alt: "Bench overlooking a view" },
  { file: "annagrad4.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "grantgrad10.jpeg",         category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "boatlighthouse.JPG",       category: "Travel",   featured: true, alt: "Boat passing a lighthouse" },
  { file: "smallbirdzoom.JPG",        category: "Travel",   featured: false, alt: "Close up of a small bird" },
  { file: "swisspark.JPG",            category: "Travel",   featured: false, alt: "Park in Switzerland" },
  { file: "beachchairs.JPG",          category: "Travel",   featured: false, alt: "Beach chairs" },
  { file: "annagrad7.JPG",            category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "streetsunset.JPG",         category: "Travel",   featured: false, alt: "Sunset down a street" },
  { file: "glassbirds.JPG",           category: "Travel",   featured: false, alt: "Glass bird figurines" },
  { file: "whitetrinkets.JPG",        category: "Travel",   featured: false, alt: "White trinkets on display" },
  { file: "vintagelibrary.JPG",       category: "Travel",   featured: true, alt: "Vintage library" },
  { file: "plantdisplay.JPG",         category: "Travel",   featured: true, alt: "Plant display" },
  { file: "desk.JPG",                 category: "Travel",   featured: false, alt: "Desk by a window" },
  { file: "greenmountainclouds.JPG",  category: "Travel",   featured: false, alt: "Clouds over green mountains" },
  { file: "oceanandmountain.JPG",     category: "Travel",   featured: false, alt: "Ocean with a mountain behind" },
  { file: "cityriver.JPG",            category: "Travel",   featured: false, alt: "River through a city" },
  { file: "greenmountains.JPG",       category: "Travel",   featured: false, alt: "Green mountains" },
  { file: "grantgrad6.jpeg",          category: "Sessions", subcategory: "Grad", featured: false, alt: "Graduation portrait" },
  { file: "tileroofsunset.JPG",       category: "Travel",   featured: false, alt: "Sunset over tile roofs" },
];

/* Optional: the order the category bubbles appear in. Featured always comes
   first and All always comes last. Any category missing from this list still
   shows up, after these, in the order it first appears above. */
const CATEGORY_ORDER = ["Sessions", "Travel", "Candids"];
