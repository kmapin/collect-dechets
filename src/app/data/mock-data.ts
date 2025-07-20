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
        { secteur: "1", quartiers: ["Bilbalogo"] },
        { secteur: "2", quartiers: ["Saint Léon", "Oscar Yaar", "Zone Commerciale", "Dapoya1", "Quartiers Saints"] },
        { secteur: "3", quartiers: ["Koulouba", "Rotonde", "Université de Ouagadougou", "Zone Ministères et Ambassades"] },
        { secteur: "4", quartiers: ["Kamsonghin", "Cité An II", "Zone ZACA (Aéroport)", "Boince Yaar", "Zangouettin"] },
        { secteur: "5", quartiers: ["Samadin", "Kouritenga", "Mankoudougou"] }
      ]
    },
    {
      arrondissement: "Arrondissement 2",
      secteurs: [
        { secteur: "6", quartiers: ["Goughin sud", "Gandin (Petit Paris)"] },
        { secteur: "7", quartiers: ["Goughin nord", "Baoghin"] },
        { secteur: "8", quartiers: ["Hamdalaye", "Larlé", "Marché du 10"] },
        { secteur: "9", quartiers: ["Baskuy Yaar", "Kolog-Naba", "Ouidi"] },
        { secteur: "10", quartiers: ["Cité An III", "Sankariaré", "Paspanga", "Niogsin"] }
      ]
    },
    {
      arrondissement: "Arrondissement 3",
      secteurs: [
        { secteur: "11", quartiers: ["Dapoya II", "Nemnin"] },
        { secteur: "12", quartiers: ["Camp militaire", "Naab Pougo"] },
        { secteur: "13", quartiers: ["Yaoghin", "Zongho"] },
        { secteur: "14", quartiers: ["Noncin", "Rimkiéta"] },
        { secteur: "15", quartiers: ["Toécin", "Kilwin"] }
      ]
    },
    {
      arrondissement: "Arrondissement 4",
      secteurs: [
        { secteur: "16", quartiers: ["Tampouy"] },
        { secteur: "17", quartiers: ["Koulweoghin", "Tanghin"] },
        { secteur: "18", quartiers: ["Somgandé", "Sambin barrage"] },
        { secteur: "19", quartiers: ["Zone industrielle Kossodo", "Toudoubwéogo"] }
      ]
    },
    {
      arrondissement: "Arrondissement 5",
      secteurs: [
        { secteur: "20", quartiers: ["Sogdin", "Polesgo", "Tabtenga"] },
        { secteur: "21", quartiers: ["ENAREF Cogeb", "Wayalghin"] },
        { secteur: "22", quartiers: ["Zone du Bois", "Zogona"] },
        { secteur: "23", quartiers: ["1200 Logement", "Dagnoin", "Wemtenga"] }
      ]
    },
    {
      arrondissement: "Arrondissement 6",
      secteurs: [
        { secteur: "24", quartiers: ["Ronsin (1200 logements)", "Kalgodin", "Ouaga Inter", "SIAO", "Silmissin", "Toeyibin"] },
        { secteur: "25", quartiers: ["Pagalayiri"] },
        { secteur: "26", quartiers: ["Cissin", "Pissy"] },
        { secteur: "27", quartiers: ["Bongnaam"] },
        { secteur: "28", quartiers: ["Kouritenga", "Sonré"] },
        { secteur: "29", quartiers: ["Song-Naaba", "Kouritenga", "Azimo/Socogib"] },
      ]
    },
    {
      arrondissement: "Arrondissement 7",
      secteurs: [
        { secteur: "30", quartiers: ["Nagrin"] },
        { secteur: "31", quartiers: ["Yaoghin", "Bonheur-Ville", "Waa-Paasi", "Belle-Ville"] },
        { secteur: "32", quartiers: ["Sandogo", "Boassa", "Kankamsin"] },
        { secteur: "33", quartiers: ["Zagtouli sud"] },
      ]
    },
    {
      arrondissement: "Arrondissement 8",
      secteurs: [
        { secteur: "34", quartiers: ["Zagtouli nord", "Darsalam", "Zongo", "Nabitenga"] },
        { secteur: "35", quartiers: ["Nonghin", "Bassinko/Basseko", "Sogpelcé"] },
        { secteur: "36", quartiers: ["Bissighin", "Silmiougou", "Gantin", "Silmiyiri"] },
      ]
    },
    {
      arrondissement: "Arrondissement 9",
      secteurs: [
        { secteur: "37", quartiers: ["Marcoussis", "Bissighin", "Yagma"] },
        { secteur: "38", quartiers: ["Ouapassi", "Kamboincé", "Zoodnoma", "Watinonma", "Kossoghin", "Silmiyiri"] },
        { secteur: "39", quartiers: ["Bangpooré", "Wobriguéré", "Babouang Rouanga", "Toudweogo"] },
        { secteur: "40", quartiers: ["Kamboissin", "Dapaweoghin", "Toeghin", "Sakoula"] },
      ]
    },
    {
      arrondissement: "Arrondissement 10",
      secteurs: [
        { secteur: "41", quartiers: ["Kossodo", "Nioko II"] },
        { secteur: "42", quartiers: ["Bendogo", "Wayalghin", "Nioko I", "Godin"] },
        { secteur: "43", quartiers: ["Dassasgho", "Goundrin"] },
        { secteur: "44", quartiers: ["Quatorze-Yaar"] },
        { secteur: "45", quartiers: ["Djikof", "Taabtenga"] },
      ]
    },
    {
      arrondissement: "Arrondissement 11",
      secteurs: [
        { secteur: "46", quartiers: ["Zone une", "Katr-yaar"] },
        { secteur: "47", quartiers: ["Rayongo", "Yamtenga", "Ouidtenga"] },
        { secteur: "48", quartiers: ["Kaparla non loti/Dayongo"] },
        { secteur: "49", quartiers: ["Balkuy"] },
        { secteur: "50", quartiers: ["Lanoayiri"] },
        { secteur: "51", quartiers: ["Karpala", "Sanyiri"] },
      ]
    },
    {
      arrondissement: "Arrondissement 12",
      secteurs: [
        { secteur: "52", quartiers: ["Patte d’Oie"] },
        { secteur: "53", quartiers: ["Trame d’Accueil", "Ouaga 2000 (Côté ambassade USA)"] },
        { secteur: "54", quartiers: ["Ouaga 2000", "Côté Libya hôtel"] },
        { secteur: "55", quartiers: ["Kossyam"] }
      ]
    }
  ];
  