import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// Todo: XSD validating

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
    const xmlFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".xml"
    );
    // Read XML files
    xmlFiles.forEach(async (file) => {
      const filePath = path.join(inputDirectory, file);
      try {
        // XML parser
        const parser = new XMLParser({
          ignoreAttributes: false,
        });
        // Read input file & parse
        const inputFile = await fs.promises.readFile(filePath, "utf8");
        let inputObject = parser.parse(inputFile);
        generateOutputFile(inputObject, file);
      } catch (error) {
        console.error(`❌ Error processing file: ${file}: `, error);
      }
    });
  });
};

const generateOutputFile = (inputObject: any, file: string) => {
  try {
    // XML builder
    const builder = new XMLBuilder({
      attributeNamePrefix: "$",
      ignoreAttributes: ["unitCode"],
      format: true,
    });

    // Get pickup and delivery data
    let data =
      inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
        "cac:ConsolidatedShipment"
      ]["cac:ShipmentStage"][
        inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
          "cac:ConsolidatedShipment"
        ]["cac:ShipmentStage"].length - 1
      ]["cac:TransportEvent"];

    // Build the XML file
    const outputContent = builder.build({
      transportbookings: {
        transportbooking: {
          edireference:
            inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
              "cac:ConsolidatedShipment"
            ]["cbc:ID"],
          reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
          customer_id: {
            $matchmode: "1",
            "#text": "NEELEVAT",
          },
          shipments: {
            shipment: {
              edireference:
                inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                  "cac:ConsolidatedShipment"
                ]["cbc:ID"],
              reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
              pickupaddress: {
                reference: `${inputObject.Manifest["cbc:ID"]}/${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cbc:ID"]}`,
                address_id: {
                  $matchmode: "1",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cbc:Name"],
                },
                name: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cac:Location"
                ]["cbc:Name"],
                date: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cbc:OccurrenceDate"
                ],
                time: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cbc:OccurrenceTime"
                ],
                address1: data.find(
                  (d: any) => d["cbc:Description"] === "from"
                )["cac:Location"]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
                zipcode: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cac:Location"
                ]["cac:Address"]["cbc:PostalZone"],
                city_id: {
                  $matchmode: "4",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cac:Address"]["cbc:CityName"],
                },
                country_id: {
                  $matchmode: "4",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cac:Address"]["cac:Country"][
                    "cbc:IdentificationCode"
                  ],
                },
              },
              deliveryaddress: {
                reference: `${inputObject.Manifest["cbc:ID"]}/${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cac:ConsolidatedShipment"]["cbc:ID"]}`,
                address_id: {
                  $matchmode: "1",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cbc:Name"],
                },
                name: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cbc:Name"],
                date: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cbc:OccurrenceDate"
                ],
                time: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cbc:OccurrenceTime"
                ],
                address1: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
                zipcode: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cac:Address"]["cbc:PostalZone"],
                city_id: {
                  $matchmode: "4",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cac:Address"]["cbc:CityName"],
                },
                country_id: {
                  $matchmode: "4",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cac:Address"]["cac:Country"]["cbc:IdentificationCode"],
                },
              },
              cargo: {
                unitamount:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"][
                    "cbc:TotalTransportHandlingUnitQuantity"
                  ],
                unit_id: {
                  $matchmode: "1",
                  "#text": "COL",
                },
                weight:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:GrossWeightMeasure"]["#text"],
                loadingmeter:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:LoadingLengthMeasure"]["#text"],
              },
              cod: {
                amount: inputObject.Manifest["cac:Shipment"][
                  "cac:FreightAllowanceCharge"
                ].reduce(
                  (sum: number, current: number) =>
                    sum + parseFloat(current["cbc:Amount"]["#text"]),
                  0
                ),
              },
            },
          },
        },
      },
    });
    // Generate output file
    const ref = new Date().getTime();
    const outputPath = path.resolve(`${outputDirectory}/${ref}-${file}`);
    fs.writeFileSync(outputPath, outputContent);
    console.log(`✅ Successfully generated: ${ref}-${file}`);
  } catch (error) {
    console.error(`❌ Error generating output file: ${file}: `, error);
  }
};

readInputFiles();
