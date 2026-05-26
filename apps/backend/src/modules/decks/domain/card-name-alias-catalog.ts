import { Injectable } from "@nestjs/common";
import { CardNameNormalizer } from "./card-name-normalizer";

interface CardNameAliasEntry {
  officialName: string;
  aliases: string[];
}

@Injectable()
export class CardNameAliasCatalog {
  private readonly aliasToOfficialName: Map<string, string>;

  constructor(private readonly normalizer: CardNameNormalizer) {
    this.aliasToOfficialName = new Map(
      CARD_NAME_ALIAS_ENTRIES.flatMap((entry) =>
        entry.aliases.map((alias) => [this.normalizer.normalize(alias), entry.officialName] as const)
      )
    );
  }

  resolveOfficialName(originalName: string): string | null {
    return this.aliasToOfficialName.get(this.normalizer.normalize(originalName)) ?? null;
  }
}

const CARD_NAME_ALIAS_ENTRIES: CardNameAliasEntry[] = [
  {
    officialName: "Silvy of the White Forest",
    aliases: ["Silvy del Bosque Blanco"]
  },
  {
    officialName: "Elzette of the White Forest",
    aliases: ["Elzette del Bosque Blanco"]
  },
  {
    officialName: "Elzette, Azamina of the White Forest",
    aliases: [
      "Elzette, Azamina del Bosque Blanco",
      "Elzette Azamina del Bosque Blanco",
      "Ese Azamina del Bosque Blanes"
    ]
  },
  {
    officialName: "Diabellstar the Black Witch",
    aliases: ["Diabellstar la Bruja Negra", "Diabelistar la Bruja Negra"]
  },
  {
    officialName: "Diabellze the White Witch",
    aliases: ["Diabellze la Bruja Blanca", "Diabelze la Bruja Blanca", "Diabellize la Bruja Blanca", "Diabelize la Bruja Blanca"]
  },
  {
    officialName: "Diabellstar Vengeance",
    aliases: ["Diabellstar Venganza", "Diabelistar Venganza"]
  },
  {
    officialName: "Mulcharmy Fuwalos",
    aliases: ["Fuwalos Multivadora"]
  },
  {
    officialName: "Mulcharmy Purulia",
    aliases: ["Purulia Multivadora"]
  },
  {
    officialName: "Nibiru, the Primal Being",
    aliases: ["Nibiru, el Ser Primitivo", "Nibiru el Ser Primitivo"]
  },
  {
    officialName: "Ash Blossom & Joyous Spring",
    aliases: ["Flor de Ceniza & Primavera Feliz", "Flor de Ceniza Primavera Feliz"]
  },
  {
    officialName: "Droll & Lock Bird",
    aliases: ["El Bufon y el Pajaro del Candado"]
  },
  {
    officialName: "Tales of the White Forest",
    aliases: ["Cuentos del Bosque Blanco"]
  },
  {
    officialName: "Sinful Spoils of the White Forest",
    aliases: ["Botin del Pecado del Bosque Blanco"]
  },
  {
    officialName: "The Hallowed Azamina",
    aliases: ["La Azamina Sagrada"]
  },
  {
    officialName: "Deception of the Sinful Spoils",
    aliases: [
      "Engano del Botin del Pecado",
      "Engafio del Botin del Pecado",
      "Engaño del Botín del Pecado"
    ]
  },
  {
    officialName: "WANTED: Seeker of Sinful Spoils",
    aliases: ["SE BUSCA: Rastreadores del Botin del Pecado", "SE BUSCA Rastreadores del Botin del Pecado"]
  },
  {
    officialName: "Witch of the White Forest",
    aliases: ["Bruja del Bosque Blanco"]
  },
  {
    officialName: "Called by the Grave",
    aliases: ["Llamado por la Tumba"]
  },
  {
    officialName: "Filia Diabell",
    aliases: ["Filia Diabell"]
  },
  {
    officialName: "Forbidden Droplet",
    aliases: ["Gotas Prohibidas"]
  },
  {
    officialName: "Triple Tactics Talent",
    aliases: ["Talento de Tacticas Triples", "Talento de Tácticas Triples"]
  },
  {
    officialName: "Triple Tactics Thrust",
    aliases: ["Impulso de Tacticas Triples", "Impulso de Tácticas Triples"]
  },
  {
    officialName: "The Gaze of Timaeus",
    aliases: ["La Mirada de Timaeus"]
  },
  {
    officialName: "Crossout Designator",
    aliases: ["Designador de Crossout"]
  },
  {
    officialName: "Azamina Debtors",
    aliases: ["Deudoras Azamina"]
  },
  {
    officialName: "Curse of Diabell",
    aliases: ["Maldicion de Diabell", "Maldición de Diabell"]
  },
  {
    officialName: "Infinite Impermanence",
    aliases: ["Infinito Temporal"]
  },
  {
    officialName: "Silvera, Wolf Tamer of the White Forest",
    aliases: ["Silveira, Donadora de los Lobos del Bosque Blanco", "Silvera, Donadora de los Lobos del Bosque Blanco"]
  },
  {
    officialName: "Diabell, Queen of the White Forest",
    aliases: ["Diabell, Reina del Bosque Blanco"]
  },
  {
    officialName: "Rciela, Sinister Soul of the White Forest",
    aliases: ["Rciela, Alma Siniestra del Bosque Blanco"]
  },
  {
    officialName: "Poplar of the White Forest",
    aliases: ["Alamo del Bosque Blanco"]
  },
  {
    officialName: "Azamina Mu Rcielago",
    aliases: ["Azamina Mu Rcielago", "Azamina Mu Reielago", "Azamina Mu Reiélago"]
  },
  {
    officialName: "Azamina Ilia Silvia",
    aliases: ["Azamina Ilia Silvia", "Azamina Ilia Sivia"]
  },
  {
    officialName: "Azamina",
    aliases: ["Azamina"]
  },
  {
    officialName: "Saint Azamina",
    aliases: ["Santa Azamina"]
  },
  {
    officialName: "S:P Little Knight",
    aliases: ["S:P Pequena Caballera", "S P Pequena Caballera", "S:P Pequeña Caballera"]
  },
  {
    officialName: "Snake-Eyes Vengeance Dragon",
    aliases: ["Dragon de Venganza Ojos de Serpiente", "Dragón de Venganza Ojos de Serpiente"]
  },
  {
    officialName: "Azamina Moa Regina",
    aliases: ["Azamina Moa Regina"]
  },
  {
    officialName: "Red-Eyes Dark Dragoon",
    aliases: ["Dragoon Oscuro de Ojos Rojos"]
  },
  {
    officialName: "Dark Magician of Destruction",
    aliases: ["Mago Oscuro de la Destruccion", "Mago Oscuro de la Destrucción"]
  },
  {
    officialName: "Chaos Angel",
    aliases: ["Angel del Caos"]
  },
  {
    officialName: "Zalen the Shackled Dragon",
    aliases: ["Zalen el Dragon Encadenado", "Zalen el Dragón Encadenado"]
  },
  {
    officialName: "Ghost Belle & Haunted Mansion",
    aliases: ["Bella Fantasma & Mansion Embrujada", "Bella Fantasma y Mansion Embrujada"]
  },
  {
    officialName: "Super Polymerization",
    aliases: ["Super Polimerizacion", "Súper Polimerización"]
  },
  {
    officialName: "Lightning Storm",
    aliases: ["Tormenta de Relampagos", "Tormenta de Relámpagos"]
  },
  {
    officialName: "Woes of the White Forest",
    aliases: ["Infortunios del Bosque Blanco"]
  },
  {
    officialName: "Sea Monster of Theseus",
    aliases: ["Monstruo Marino de Teseo"]
  },
  {
    officialName: "Mudragon of the Swamp",
    aliases: ["Fangodragon del Pantano", "Fangodragón del Pantano"]
  }
];
