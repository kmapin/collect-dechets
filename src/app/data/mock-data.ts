// mock-data.ts

export interface QuartierData {
    arrondissement: string;
    secteurs: {
      secteur: string;
      quartiers: string[];
    }[];
  }
  
  export const OUAGA_DATA: QuartierData[] = [
    {
      arrondissement: "Arrondissement 1",
      secteurs: [
        {
          secteur: "Bilbalogo",
          quartiers: ["Saint Léon", "Oscar Yaar", "Zone Commerciale", "Dapoya1", "Quartiers Saints"]
        },
        {
          secteur: "Koulouba",
          quartiers: ["Rotonde", "Université de Ouagadougou", "Zone Ministères et Ambassades"]
        },
        {
          secteur: "Kamsonghin",
          quartiers: ["Cité An II", "Zone ZACA (Aéroport)", "Boince Yaar", "Zangouettin"]
        },
        {
          secteur: "Samadin",
          quartiers: ["Kouritenga", "Mankoudougou"]
        },
        {
          secteur: "Goughin sud",
          quartiers: ["Gandin (Petit Paris)"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 2",
      secteurs: [
        {
          secteur: "Goughin nord",
          quartiers: ["Baoghin"]
        },
        {
          secteur: "Hamdalaye",
          quartiers: ["Larlé", "Marché du 10"]
        },
        {
          secteur: "Baskuy Yaar",
          quartiers: ["Kolog-Naba", "Ouidi"]
        },
        {
          secteur: "Cité An III",
          quartiers: ["Sankariaré", "Paspanga", "Niogsin"]
        },
        {
          secteur: "Dapoya II",
          quartiers: ["Nemnin"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 3",
      secteurs: [
        {
          secteur: "Camp militaire",
          quartiers: ["Naab Pougo"]
        },
        {
          secteur: "Yaoghin",
          quartiers: ["Zongho"]
        },
        {
          secteur: "Noncin",
          quartiers: ["Rimkiéta"]
        },
        {
          secteur: "Toécin",
          quartiers: ["Kilwin"]
        },
        {
          secteur: "Tampouy",
          quartiers: []
        }
      ]
    },
    {
      arrondissement: "Arrondissement 4",
      secteurs: [
        {
          secteur: "Koulweoghin",
          quartiers: ["Tanghin"]
        },
        {
          secteur: "Somgandé",
          quartiers: ["Sambin barrage"]
        },
        {
          secteur: "Zone industrielle Kossodo",
          quartiers: ["Toudoubwéogo"]
        },
        {
          secteur: "Sogdin",
          quartiers: ["Polesgo", "Tabtenga"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 5",
      secteurs: [
        {
          secteur: "ENAREF Cogeb",
          quartiers: ["Wayalghin"]
        },
        {
          secteur: "Zone du Bois",
          quartiers: ["Zogona"]
        },
        {
          secteur: "1200 Logement",
          quartiers: ["Dagnoin", "Wemtenga"]
        },
        {
          secteur: "Ronsin (1200 logements)",
          quartiers: ["Kalgodin", "Ouaga Inter", "SIAO", "Silmissin", "Toeyibin"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 6",
      secteurs: [
        {
          secteur: "Pagalayiri",
          quartiers: []
        },
        {
          secteur: "Cissin",
          quartiers: ["Pissy"]
        },
        {
          secteur: "Bongnaam",
          quartiers: []
        },
        {
          secteur: "Kouritenga",
          quartiers: ["Sonré"]
        },
        {
          secteur: "Song-Naaba",
          quartiers: ["Kouritenga", "Azimo/Socogib"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 7",
      secteurs: [
        {
          secteur: "Nagrin",
          quartiers: []
        },
        {
          secteur: "Yaoghin",
          quartiers: ["Bonheur-Ville", "Waa-Paasi", "Belle-Ville"]
        },
        {
          secteur: "Sandogo",
          quartiers: ["Boassa", "Kankamsin"]
        },
        {
          secteur: "Zagtouli sud",
          quartiers: []
        }
      ]
    },
    {
      arrondissement: "Arrondissement 8",
      secteurs: [
        {
          secteur: "Zagtouli nord",
          quartiers: ["Darsalam", "Zongo", "Nabitenga"]
        },
        {
          secteur: "Nonghin",
          quartiers: ["Bassinko/Basseko", "Sogpelcé"]
        },
        {
          secteur: "Bissighin",
          quartiers: ["Silmiougou", "Gantin", "Silmiyiri"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 9",
      secteurs: [
        {
          secteur: "Marcoussis",
          quartiers: ["Bissighin", "Yagma"]
        },
        {
          secteur: "Ouapassi",
          quartiers: ["Kamboincé", "Zoodnoma", "Watinonma", "Kossoghin", "Silmiyiri"]
        },
        {
          secteur: "Bangpooré",
          quartiers: ["Wobriguéré", "Babouang Rouanga", "Toudweogo"]
        },
        {
          secteur: "Kamboissin",
          quartiers: ["Dapaweoghin", "Toeghin", "Sakoula"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 10",
      secteurs: [
        {
          secteur: "Kossodo",
          quartiers: ["Nioko II"]
        },
        {
          secteur: "Bendogo",
          quartiers: ["Wayalghin", "Nioko I", "Godin"]
        },
        {
          secteur: "Dassasgho",
          quartiers: ["Goundrin"]
        },
        {
          secteur: "Quatorze-Yaar",
          quartiers: []
        },
        {
          secteur: "Djikof",
          quartiers: ["Taabtenga"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 11",
      secteurs: [
        {
          secteur: "Zone une",
          quartiers: ["Katr-yaar"]
        },
        {
          secteur: "Rayongo",
          quartiers: ["Yamtenga", "Ouidtenga"]
        },
        {
          secteur: "Kaparla non loti/Dayongo",
          quartiers: []
        },
        {
          secteur: "Balkuy",
          quartiers: []
        },
        {
          secteur: "Lanoayiri",
          quartiers: []
        },
        {
          secteur: "Karpala",
          quartiers: ["Sanyiri"]
        }
      ]
    },
    {
      arrondissement: "Arrondissement 12",
      secteurs: [
        {
          secteur: "Patte d’Oie",
          quartiers: []
        },
        {
          secteur: "Trame d’Accueil",
          quartiers: ["Ouaga 2000 (Côté ambassade USA)"]
        },
        {
          secteur: "Ouaga 2000",
          quartiers: ["Côté Libya hôtel"]
        },
        {
          secteur: "Kossyam",
          quartiers: []
        }
      ]
    }
  ];
  