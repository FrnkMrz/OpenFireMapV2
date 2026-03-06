import fs from "node:fs";
import path from "node:path";

const langDir = path.join(process.cwd(), "src", "js", "lang");
const files = fs.readdirSync(langDir).filter(f => f.endsWith(".js"));

const translations = {
    de: { cluster_info: "Objekte innerhalb 5m", details_hydrant: "Hydranten-Details" },
    en: { cluster_info: "Objects within 5m", details_hydrant: "Hydrant Details" },
    fr: { cluster_info: "Objets dans un rayon de 5m", details_hydrant: "Détails de l'hydrante" },
    es: { cluster_info: "Objetos a menos de 5m", details_hydrant: "Detalles del hidrante" },
    it: { cluster_info: "Oggetti entro 5m", details_hydrant: "Dettagli idrante" },
    pt: { cluster_info: "Objetos num raio de 5m", details_hydrant: "Detalhes do hidrante" },
    nl: { cluster_info: "Objecten binnen 5m", details_hydrant: "Hydrant Details" },
    pl: { cluster_info: "Obiekty w promieniu 5m", details_hydrant: "Szczegóły hydrantu" },
    cs: { cluster_info: "Objekty v okruhu 5m", details_hydrant: "Detaily hydrantu" },
    ru: { cluster_info: "Объекты в радиусе 5м", details_hydrant: "Детали гидранта" },
    ja: { cluster_info: "5m以内のオブジェクト", details_hydrant: "消火栓の詳細" },
    zh: { cluster_info: "5米内的对象", details_hydrant: "消防栓详情" }
};

for (const file of files) {
    const filePath = path.join(langDir, file);
    let content = fs.readFileSync(filePath, "utf8");

    // Default to EN if not specified above
    const langCode = file.replace('.js', '');
    const t = translations[langCode] || translations['en'];

    if (!content.includes('cluster_info')) {
        // Add a comma after whatever the last property was
        content = content.replace(/};\s*export default strings;/,
            `,\n    cluster_info: "${t.cluster_info}",\n    details_hydrant: "${t.details_hydrant}"\n};\nexport default strings;`);
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Updated ${file}`);
    } else {
        console.log(`Skipped ${file} - already has cluster_info`);
    }
}
console.log("Done adding translation keys.");
