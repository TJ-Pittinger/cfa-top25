// All FBS teams for the 2026 season.
// [ESPN team id, display name, abbreviation, conference]
// The ESPN id is used for logo file names (logos/<id>.png).
// Run tools/download_logos.py once to download logos and double-check every id.
window.TEAMS = [
  // SEC (16)
  [333, "Alabama", "ALA", "SEC"], [8, "Arkansas", "ARK", "SEC"], [2, "Auburn", "AUB", "SEC"],
  [57, "Florida", "FLA", "SEC"], [61, "Georgia", "UGA", "SEC"], [96, "Kentucky", "UK", "SEC"],
  [99, "LSU", "LSU", "SEC"], [145, "Ole Miss", "MISS", "SEC"], [344, "Mississippi State", "MSST", "SEC"],
  [142, "Missouri", "MIZ", "SEC"], [201, "Oklahoma", "OU", "SEC"], [2579, "South Carolina", "SC", "SEC"],
  [2633, "Tennessee", "TENN", "SEC"], [251, "Texas", "TEX", "SEC"], [245, "Texas A&M", "TA&M", "SEC"],
  [238, "Vanderbilt", "VAN", "SEC"],
  // Big Ten (18)
  [356, "Illinois", "ILL", "Big Ten"], [84, "Indiana", "IU", "Big Ten"], [2294, "Iowa", "IOWA", "Big Ten"],
  [120, "Maryland", "MD", "Big Ten"], [130, "Michigan", "MICH", "Big Ten"], [127, "Michigan State", "MSU", "Big Ten"],
  [135, "Minnesota", "MINN", "Big Ten"], [158, "Nebraska", "NEB", "Big Ten"], [77, "Northwestern", "NU", "Big Ten"],
  [194, "Ohio State", "OSU", "Big Ten"], [2483, "Oregon", "ORE", "Big Ten"], [213, "Penn State", "PSU", "Big Ten"],
  [2509, "Purdue", "PUR", "Big Ten"], [164, "Rutgers", "RUTG", "Big Ten"], [26, "UCLA", "UCLA", "Big Ten"],
  [30, "USC", "USC", "Big Ten"], [264, "Washington", "WASH", "Big Ten"], [275, "Wisconsin", "WIS", "Big Ten"],
  // ACC (17)
  [103, "Boston College", "BC", "ACC"], [25, "California", "CAL", "ACC"], [228, "Clemson", "CLEM", "ACC"],
  [150, "Duke", "DUKE", "ACC"], [52, "Florida State", "FSU", "ACC"], [59, "Georgia Tech", "GT", "ACC"],
  [97, "Louisville", "LOU", "ACC"], [2390, "Miami", "MIA", "ACC"], [152, "NC State", "NCST", "ACC"],
  [153, "North Carolina", "UNC", "ACC"], [221, "Pittsburgh", "PITT", "ACC"], [2567, "SMU", "SMU", "ACC"],
  [24, "Stanford", "STAN", "ACC"], [183, "Syracuse", "SYR", "ACC"], [258, "Virginia", "UVA", "ACC"],
  [259, "Virginia Tech", "VT", "ACC"], [154, "Wake Forest", "WAKE", "ACC"],
  // Big 12 (16)
  [12, "Arizona", "ARIZ", "Big 12"], [9, "Arizona State", "ASU", "Big 12"], [239, "Baylor", "BAY", "Big 12"],
  [252, "BYU", "BYU", "Big 12"], [2132, "Cincinnati", "CIN", "Big 12"], [38, "Colorado", "COLO", "Big 12"],
  [248, "Houston", "HOU", "Big 12"], [66, "Iowa State", "ISU", "Big 12"], [2305, "Kansas", "KU", "Big 12"],
  [2306, "Kansas State", "KSU", "Big 12"], [197, "Oklahoma State", "OKST", "Big 12"], [2628, "TCU", "TCU", "Big 12"],
  [2641, "Texas Tech", "TTU", "Big 12"], [2116, "UCF", "UCF", "Big 12"], [254, "Utah", "UTAH", "Big 12"],
  [277, "West Virginia", "WVU", "Big 12"],
  // Pac-12 (8)
  [68, "Boise State", "BSU", "Pac-12"], [36, "Colorado State", "CSU", "Pac-12"], [278, "Fresno State", "FRES", "Pac-12"],
  [204, "Oregon State", "ORST", "Pac-12"], [21, "San Diego State", "SDSU", "Pac-12"], [326, "Texas State", "TXST", "Pac-12"],
  [328, "Utah State", "USU", "Pac-12"], [265, "Washington State", "WSU", "Pac-12"],
  // Mountain West (10)
  [2005, "Air Force", "AF", "Mountain West"], [62, "Hawai'i", "HAW", "Mountain West"], [2440, "Nevada", "NEV", "Mountain West"],
  [167, "New Mexico", "UNM", "Mountain West"], [2449, "North Dakota State", "NDSU", "Mountain West"],
  [2459, "Northern Illinois", "NIU", "Mountain West"], [23, "San José State", "SJSU", "Mountain West"],
  [2439, "UNLV", "UNLV", "Mountain West"], [2638, "UTEP", "UTEP", "Mountain West"], [2751, "Wyoming", "WYO", "Mountain West"],
  // American (14)
  [349, "Army", "ARMY", "American"], [2429, "Charlotte", "CLT", "American"], [151, "East Carolina", "ECU", "American"],
  [2226, "Florida Atlantic", "FAU", "American"], [235, "Memphis", "MEM", "American"], [2426, "Navy", "NAVY", "American"],
  [249, "North Texas", "UNT", "American"], [242, "Rice", "RICE", "American"], [58, "South Florida", "USF", "American"],
  [218, "Temple", "TEM", "American"], [2655, "Tulane", "TULN", "American"], [202, "Tulsa", "TLSA", "American"],
  [5, "UAB", "UAB", "American"], [2636, "UTSA", "UTSA", "American"],
  // Sun Belt (14)
  [2026, "App State", "APP", "Sun Belt"], [2032, "Arkansas State", "ARST", "Sun Belt"], [324, "Coastal Carolina", "CCU", "Sun Belt"],
  [290, "Georgia Southern", "GASO", "Sun Belt"], [2247, "Georgia State", "GAST", "Sun Belt"], [256, "James Madison", "JMU", "Sun Belt"],
  [309, "Louisiana", "ULL", "Sun Belt"], [2348, "Louisiana Tech", "LT", "Sun Belt"], [276, "Marshall", "MRSH", "Sun Belt"],
  [295, "Old Dominion", "ODU", "Sun Belt"], [6, "South Alabama", "USA", "Sun Belt"], [2572, "Southern Miss", "USM", "Sun Belt"],
  [2653, "Troy", "TROY", "Sun Belt"], [2433, "UL Monroe", "ULM", "Sun Belt"],
  // Conference USA (10)
  [48, "Delaware", "DEL", "C-USA"], [2229, "FIU", "FIU", "C-USA"], [55, "Jacksonville State", "JVST", "C-USA"],
  [338, "Kennesaw State", "KENN", "C-USA"], [2335, "Liberty", "LIB", "C-USA"], [2393, "Middle Tennessee", "MTSU", "C-USA"],
  [2623, "Missouri State", "MOST", "C-USA"], [166, "New Mexico State", "NMSU", "C-USA"], [2534, "Sam Houston", "SHSU", "C-USA"],
  [98, "Western Kentucky", "WKU", "C-USA"],
  // MAC (13)
  [2006, "Akron", "AKR", "MAC"], [2050, "Ball State", "BALL", "MAC"], [189, "Bowling Green", "BGSU", "MAC"],
  [2084, "Buffalo", "BUFF", "MAC"], [2117, "Central Michigan", "CMU", "MAC"], [2199, "Eastern Michigan", "EMU", "MAC"],
  [2309, "Kent State", "KENT", "MAC"], [193, "Miami (OH)", "M-OH", "MAC"], [195, "Ohio", "OHIO", "MAC"],
  [16, "Sacramento State", "SAC", "MAC"], [2649, "Toledo", "TOL", "MAC"], [113, "UMass", "MASS", "MAC"],
  [2711, "Western Michigan", "WMU", "MAC"],
  // Independents (2)
  [87, "Notre Dame", "ND", "Independent"], [41, "UConn", "CONN", "Independent"]
].map(function (t) { return { id: t[0], name: t[1], abbr: t[2], conf: t[3] }; });

window.CONFERENCES = ["SEC", "Big Ten", "ACC", "Big 12", "Pac-12", "Mountain West", "American", "Sun Belt", "C-USA", "MAC", "Independent"];
