"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
// Todo: XSD validating
const DEBUGGING = false;
// Default directories
const inputDirectory = "./src/input";
const outputDirectory = "./src/output";
const readInputFiles = () => {
    fs.readdir(inputDirectory, (error, files) => {
        // Error handling
        if (error) {
            console.error("❌ Error reading input directory: ", error);
            return;
        }
        // Filter XML files
        if (files.length > 0) {
            const xmlFiles = files.filter((file) => path.extname(file).toLowerCase() === ".xml");
            // Read XML files
            xmlFiles.forEach((file, index) => __awaiter(void 0, void 0, void 0, function* () {
                const filePath = path.join(inputDirectory, file);
                try {
                    // XML parser
                    const parser = new fast_xml_parser_1.XMLParser({
                        ignoreAttributes: false,
                    });
                    // Read input file & parse
                    const inputFile = yield fs.promises.readFile(filePath, "utf8");
                    let inputObject = parser.parse(inputFile);
                    generateOutputFile(inputObject, file, index);
                }
                catch (error) {
                    console.error(`❌ Error processing file: ${file}: `, error);
                }
            }));
        }
        else {
            console.log("❌ No XML files found in input directory");
        }
    });
};
const generateOutputFile = (inputObject, file, index) => {
    var _a, _b, _c, _d;
    try {
        // XML builder
        const builder = new fast_xml_parser_1.XMLBuilder({
            attributeNamePrefix: "$",
            ignoreAttributes: ["unitCode"],
            format: true,
        });
        // Get pickup and delivery data
        let events = inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:ShipmentStage"].filter((i) => i["cbc:ShipmentStageType"] === "planning");
        let data;
        if (events.length === 1) {
            // Olny one event
            data = events[0]["cac:TransportEvent"];
        }
        else {
            // More than one event
            data = events.map((e) => e["cac:TransportEvent"]);
        }
        // Build the XML file
        const outputContent = builder.build({
            transportbookings: {
                transportbooking: {
                    edireference: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cbc:ID"],
                    reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
                    customer_id: {
                        $matchmode: "1",
                        "#text": "NEELEVAT",
                    },
                    shipments: {
                        shipment: {
                            edireference: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cbc:ID"],
                            reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
                            fixedprice: inputObject.Manifest["cac:Shipment"]["cac:FreightAllowanceCharge"].reduce((sum, current) => sum + parseFloat(current["cbc:Amount"]["#text"]), 0),
                            pickupaddress: {
                                reference: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cac:DocumentReference"].find((d) => d["cbc:ID"]["#text"] === 101)["cbc:DocumentTypeCode"],
                                address_id: {
                                    $matchmode: "11",
                                    "#text": data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cbc:Name"],
                                },
                                name: data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cbc:Name"],
                                date: data.find((d) => d["cbc:Description"] === "from")["cbc:OccurrenceDate"],
                                time: data.find((d) => d["cbc:Description"] === "from")["cbc:OccurrenceTime"],
                                address1: data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
                                zipcode: data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cac:Address"]["cbc:PostalZone"],
                                city_id: {
                                    $matchmode: "4",
                                    "#text": data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cac:Address"]["cbc:CityName"],
                                },
                                country_id: {
                                    $matchmode: "2",
                                    "#text": data.find((d) => d["cbc:Description"] === "from")["cac:Location"]["cac:Address"]["cac:Country"]["cbc:IdentificationCode"],
                                },
                                driverinfo: (_a = inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:SpecialInstructions"]) === null || _a === void 0 ? void 0 : _a.join(" / "),
                                remarks: (_b = inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:SpecialInstructions"]) === null || _b === void 0 ? void 0 : _b.join(" / "),
                            },
                            deliveryaddress: {
                                reference: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cac:DocumentReference"].find((d) => d["cbc:ID"]["#text"] === 103)["cbc:DocumentTypeCode"],
                                address_id: {
                                    $matchmode: "11",
                                    "#text": data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cbc:Name"],
                                },
                                name: data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cbc:Name"],
                                date: data.find((d) => d["cbc:Description"] === "to")["cbc:OccurrenceDate"],
                                time: data.find((d) => d["cbc:Description"] === "to")["cbc:OccurrenceTime"],
                                address1: data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
                                zipcode: data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cac:Address"]["cbc:PostalZone"],
                                city_id: {
                                    $matchmode: "4",
                                    "#text": data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cac:Address"]["cbc:CityName"],
                                },
                                country_id: {
                                    $matchmode: "2",
                                    "#text": data.find((d) => d["cbc:Description"] === "to")["cac:Location"]["cac:Address"]["cac:Country"]["cbc:IdentificationCode"],
                                },
                                driverinfo: (_c = inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:SpecialInstructions"]) === null || _c === void 0 ? void 0 : _c.join(" / "),
                                remarks: (_d = inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:SpecialInstructions"]) === null || _d === void 0 ? void 0 : _d.join(" / "),
                            },
                            cargo: {
                                unitamount: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:TotalTransportHandlingUnitQuantity"] ||
                                    inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:TotalGoodsItemQuantity"]["#text"],
                                unit_id: {
                                    $matchmode: "1",
                                    "#text": "COL",
                                },
                                weight: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:GrossWeightMeasure"]["#text"],
                                loadingmeter: inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cac:Consignment"]["cbc:LoadingLengthMeasure"]["#text"],
                            },
                        },
                    },
                },
            },
        });
        // Generate output file
        const ref = new Date().getTime();
        const outputPath = path.resolve(`${outputDirectory}/${ref}-${index}.xml`);
        fs.writeFileSync(outputPath, outputContent);
        console.log(`✅ Successfully generated: ${ref}-${index}.xml`);
        data = [];
        events = [];
        !DEBUGGING ? fs.unlinkSync(`./src/input/${file}`) : null;
    }
    catch (error) {
        console.error(`❌ Error generating output from: ${file}: `, error);
    }
};
readInputFiles();
//# sourceMappingURL=app.js.map