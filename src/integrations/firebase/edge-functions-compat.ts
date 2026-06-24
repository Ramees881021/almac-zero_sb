import { db, auth } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc, 
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';

const MASTER_ACCOUNT_ID = '8fcfb509-05cc-4635-879b-85b06ebb5951';

// Helper to call Lovable AI Gateway
async function callLovableAI(systemPrompt: string, userPrompt: string, tools: any[], toolChoice: any) {
  const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) {
    throw new Error("VITE_LOVABLE_API_KEY is not configured in your .env file.");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: toolChoice,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI gateway returned ${response.status}`);
  }

  return await response.json();
}

/**
 * Client-side replication of Deno Edge Functions
 */
export const edgeFunctions = {
  /**
   * copy-master-data: Copies default data from the master account to the new user.
   */
  async 'copy-master-data'(body: any, userId?: string) {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) {
      return { error: { message: "Unauthorized: No user logged in" } };
    }

    if (currentUserId === MASTER_ACCOUNT_ID) {
      return { data: { message: "Master account, skipping" }, error: null };
    }

    try {
      // Check if user already has emissions data in Firestore
      const emissionsRef = collection(db, 'emissions_data');
      const checkQ = query(emissionsRef, where('user_id', '==', currentUserId), limit(1));
      const checkSnap = await getDocs(checkQ);

      if (!checkSnap.empty) {
        return { data: { message: "User already has data" }, error: null };
      }

      const collectionsToCopy = [
        'emissions_data',
        'clients',
        'netzero_targets',
        'carbon_budgets',
        'sustainability_credentials'
      ];

      const results: string[] = [];

      for (const colName of collectionsToCopy) {
        const masterQ = query(collection(db, colName), where('user_id', '==', MASTER_ACCOUNT_ID));
        const masterSnap = await getDocs(masterQ);

        if (!masterSnap.empty) {
          const batch = writeBatch(db);
          let count = 0;

          masterSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const { id, organization_id, ...rest } = data; // skip ids
            
            const newDocRef = doc(collection(db, colName));
            batch.set(newDocRef, {
              ...rest,
              user_id: currentUserId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            count++;
          });

          await batch.commit();
          results.push(`${colName}: ${count}`);
        }
      }

      return { data: { message: "Data copied", results }, error: null };
    } catch (err: any) {
      console.error("Error copying master data:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  },

  /**
   * assign-emission-factor: Estimates emission factors for scope 3 purchased/capital goods.
   */
  async 'assign-emission-factor'(body: any) {
    const { entries } = body;
    if (!entries || entries.length === 0) {
      return { data: null, error: { message: "No entries provided" } };
    }

    try {
      const entrySummaries = entries
        .map((e: any, i: number) =>
          `Entry ${i + 1}: Category=${e.category === "purchased_goods" ? "Purchased Goods & Services" : "Capital Goods"}, Supplier="${e.supplier}", Description="${e.description}", Method=${e.method}, ${e.method === "average" ? `Quantity=${e.quantity} units` : `TotalSpend=$${e.totalSpend}`}`
        )
        .join("\n");

      const systemPrompt = `You are an expert carbon emissions analyst specializing in GHG Protocol Scope 3 emissions accounting. Your job is to assign accurate emission factors based on DEFRA 2025, IEA 2025, and EPA standards.
  
For each entry, you must determine the appropriate emission factor:
- For "average" method: provide emission factor in kg CO₂e per unit
- For "spend" method: provide emission factor in kg CO₂e per USD spent

Use the following guidelines:
- Consider the industry, product type, and supplier description
- Use DEFRA 2025 emission factors as primary reference
- For capital goods, consider embodied carbon of manufactured equipment
- For purchased goods, consider lifecycle emissions of products/materials
- Be conservative but realistic in your estimates
- If the description is vague, use a reasonable industry average

You MUST respond using the provided tool.`;

      const userPrompt = `Assign emission factors for the following ${entries.length} Scope 3 entries:\n\n${entrySummaries}`;

      const tools = [
        {
          type: "function",
          function: {
            name: "assign_emission_factors",
            description: "Assign emission factors to each entry and calculate tCO2e",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entry_index: {
                        type: "number",
                        description: "0-based index of the entry",
                      },
                      emission_factor: {
                        type: "number",
                        description: "Emission factor in kg CO₂e per unit (average method) or kg CO₂e per USD (spend method)",
                      },
                      emission_factor_source: {
                        type: "string",
                        description: "Source reference, e.g. 'DEFRA 2025 - Manufacturing' or 'EPA - Office supplies'",
                      },
                      reasoning: {
                        type: "string",
                        description: "Brief explanation of why this factor was chosen",
                      },
                    },
                    required: [
                      "entry_index",
                      "emission_factor",
                      "emission_factor_source",
                      "reasoning",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ];

      const aiData = await callLovableAI(
        systemPrompt, 
        userPrompt, 
        tools, 
        { type: "function", function: { name: "assign_emission_factors" } }
      );

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error("AI did not return tool call results");
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      const aiResults = parsed.results;

      const finalResults = entries.map((entry: any, i: number) => {
        const aiResult = aiResults.find((r: any) => r.entry_index === i);
        if (!aiResult) {
          return {
            emission_factor: 0,
            tco2e: 0,
            emission_factor_source: "Not determined",
            reasoning: "AI did not provide a factor for this entry",
          };
        }

        const ef = aiResult.emission_factor;
        let tco2e = 0;

        if (entry.method === "average" && entry.quantity) {
          tco2e = (entry.quantity * ef) / 1000;
        } else if (entry.method === "spend" && entry.totalSpend) {
          tco2e = (entry.totalSpend * ef) / 1000;
        }

        return {
          emission_factor: ef,
          tco2e: parseFloat(tco2e.toFixed(6)),
          emission_factor_source: aiResult.emission_factor_source,
          reasoning: aiResult.reasoning,
        };
      });

      return { data: { results: finalResults }, error: null };
    } catch (err: any) {
      console.error("assign-emission-factor error:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  },

  /**
   * assign-wtt-factors: Well-to-Tank and Transmission & Distribution losses.
   */
  async 'assign-wtt-factors'(body: any) {
    const { items } = body;
    if (!items || items.length === 0) {
      return { data: null, error: { message: "No items provided" } };
    }

    try {
      const itemSummaries = items
        .map((item: any, i: number) =>
          `Item ${i + 1}: Source=${item.source}, Type="${item.fuelLabel}", Quantity=${item.quantity} ${item.unit}${item.country ? `, Country=${item.country}` : ""}${item.gridRegion ? `, Grid=${item.gridRegion}` : ""}, Description="${item.description}"`
        )
        .join("\n");

      const systemPrompt = `You are an expert carbon emissions analyst specialising in GHG Protocol Scope 3 Category 3: Fuel & Energy-Related Activities (not included in Scope 1 or 2).
  
For each item you must provide the appropriate Well-to-Tank (WTT) emission factor, and for electricity items also a Transmission & Distribution (T&D) loss factor.

Guidelines:
- For Scope 1 fuels (natural gas, diesel, petrol, coal, etc.): provide the WTT factor in the SAME unit as the input (e.g. tCO₂e per kWh, tCO₂e per litre, tCO₂e per tonne). This covers upstream extraction, refining, and transport of the fuel.
- For Scope 2 electricity: provide BOTH a WTT factor (upstream generation fuel extraction) AND a T&D factor (transmission & distribution losses), both in tCO₂e per kWh. Consider the country/grid region for T&D losses.
- Use DEFRA 2025 WTT factors as primary reference.
- For T&D losses, typical values are 5-15% of the grid factor depending on country.
- Be precise and conservative.

You MUST respond using the provided tool.`;

      const userPrompt = `Assign WTT and T&D emission factors for the following ${items.length} Scope 1/2 activity items for Category 3 calculation:\n\n${itemSummaries}`;

      const tools = [
        {
          type: "function",
          function: {
            name: "assign_wtt_factors",
            description: "Assign WTT and T&D emission factors for Category 3 calculation",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_index: {
                        type: "number",
                        description: "0-based index of the item",
                      },
                      wtt_factor: {
                        type: "number",
                        description: "Well-to-Tank emission factor in tCO₂e per unit (same unit as input)",
                      },
                      td_factor: {
                        type: "number",
                        description: "Transmission & Distribution loss factor in tCO₂e per kWh (only for electricity, 0 for fuels)",
                      },
                      wtt_source: {
                        type: "string",
                        description: "Source reference e.g. 'DEFRA 2025 - WTT Natural Gas'",
                      },
                      reasoning: {
                        type: "string",
                        description: "Brief explanation of factor selection",
                      },
                    },
                    required: [
                      "item_index",
                      "wtt_factor",
                      "td_factor",
                      "wtt_source",
                      "reasoning",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ];

      const aiData = await callLovableAI(
        systemPrompt, 
        userPrompt, 
        tools, 
        { type: "function", function: { name: "assign_wtt_factors" } }
      );

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error("AI did not return tool call results");
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      const aiResults = parsed.results;

      const finalResults = items.map((item: any, i: number) => {
        const aiResult = aiResults.find((r: any) => r.item_index === i);
        if (!aiResult) {
          return {
            wtt_factor: 0,
            td_factor: 0,
            wtt_tco2e: 0,
            td_tco2e: 0,
            total_tco2e: 0,
            wtt_source: "Not determined",
            reasoning: "AI did not provide a factor for this item",
          };
        }

        const wttTco2e = item.quantity * aiResult.wtt_factor;
        const tdTco2e = item.source === "scope2" ? item.quantity * aiResult.td_factor : 0;

        return {
          wtt_factor: aiResult.wtt_factor,
          td_factor: aiResult.td_factor,
          wtt_tco2e: parseFloat(wttTco2e.toFixed(6)),
          td_tco2e: parseFloat(tdTco2e.toFixed(6)),
          total_tco2e: parseFloat((wttTco2e + tdTco2e).toFixed(6)),
          wtt_source: aiResult.wtt_source,
          reasoning: aiResult.reasoning,
        };
      });

      return { data: { results: finalResults }, error: null };
    } catch (err: any) {
      console.error("assign-wtt-factors error:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  },

  /**
   * assign-hotel-factor: Accommodations factor.
   */
  async 'assign-hotel-factor'(body: any) {
    const { country, roomNights } = body;
    if (!country || !roomNights) {
      return { data: null, error: { message: "country and roomNights required" } };
    }

    try {
      const systemPrompt = `You are an expert carbon emissions analyst specialising in hotel accommodation emissions for GHG Protocol Scope 3 Category 6 (Business Travel).
  
Your task: assign an accurate emission factor (tCO₂e per room-night) for hotel stays in a specific country.

Use these references:
- DEFRA 2025: UK = 0.01038, International average = 0.01350 tCO₂e/night
- HCMI (Hotel Carbon Measurement Initiative) country-specific factors
- IEA country grid intensity affects hotel energy consumption

Guidelines:
- Countries with high grid carbon intensity → higher hotel factors
- Countries with low grid intensity (e.g. France, Norway) → lower hotel factors
- Tropical countries may have higher cooling loads
- Developed countries generally have better energy efficiency
- Return factor in tCO₂e per room-night

You MUST respond using the provided tool.`;

      const userPrompt = `Assign a hotel stay emission factor for ${roomNights} room-nights in ${country}. Provide the factor per room-night in tCO₂e.`;

      const tools = [
        {
          type: "function",
          function: {
            name: "assign_hotel_factor",
            description: "Assign hotel stay emission factor for a country",
            parameters: {
              type: "object",
              properties: {
                emission_factor: {
                  type: "number",
                  description: "Emission factor in tCO₂e per room-night",
                },
                source: {
                  type: "string",
                  description: "Source reference e.g. 'DEFRA 2025' or 'HCMI / IEA 2025'",
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of why this factor was chosen for this country",
                },
              },
              required: ["emission_factor", "source", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      ];

      const aiData = await callLovableAI(
        systemPrompt, 
        userPrompt, 
        tools, 
        { type: "function", function: { name: "assign_hotel_factor" } }
      );

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error("AI did not return tool call results");
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      return { data: { result: parsed }, error: null };
    } catch (err: any) {
      console.error("assign-hotel-factor error:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  },

  /**
   * assign-process-factor: Estimates downstream processing of sold products.
   */
  async 'assign-process-factor'(body: any) {
    const { entries } = body;
    if (!entries || entries.length === 0) {
      return { data: null, error: { message: "No entries provided" } };
    }

    try {
      const summaries = entries
        .map((e: any, i: number) =>
          `Entry ${i + 1}: Product="${e.productName}", Process="${e.processDescription}", Mass=${e.massTonnes} tonnes`
        )
        .join("\n");

      const systemPrompt = `You are an expert carbon emissions analyst specialising in GHG Protocol Scope 3 Category 10: Processing of Sold Products.
  
Your task is to assign average process emission factors (kg CO₂e per tonne of intermediate product processed) for downstream industrial processing that the reporting company's sold products undergo.

Guidelines:
- Use DEFRA 2025, EPA, IEA, and peer-reviewed LCA data as references
- Consider the specific industrial process described (e.g. sugar refining, steel forming, chemical synthesis)
- Factor should represent the energy, fuel, and waste emissions of the downstream processing step
- Be conservative but realistic; use industry averages when specific data is unavailable
- For food processing, typical factors range 50–500 kg CO₂e/tonne depending on process intensity
- For metals/materials, typical factors range 100–2000 kg CO₂e/tonne
- For chemicals, typical factors range 200–3000 kg CO₂e/tonne

You MUST respond using the provided tool.`;

      const userPrompt = `Assign average process emission factors for the following ${entries.length} intermediate products:\n\n${summaries}`;

      const tools = [
        {
          type: "function",
          function: {
            name: "assign_process_factors",
            description: "Assign process emission factors for each sold intermediate product",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entry_index: {
                        type: "number",
                        description: "0-based index of the entry",
                      },
                      emission_factor: {
                        type: "number",
                        description: "Average process emission factor in kg CO₂e per tonne of product processed",
                      },
                      source: {
                        type: "string",
                        description: "Source reference, e.g. 'DEFRA 2025 - Food Processing' or 'EPA - Chemical Manufacturing'",
                      },
                      reasoning: {
                        type: "string",
                        description: "Brief explanation of why this factor was chosen",
                      },
                    },
                    required: [
                      "entry_index",
                      "emission_factor",
                      "source",
                      "reasoning",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ];

      const aiData = await callLovableAI(
        systemPrompt, 
        userPrompt, 
        tools, 
        { type: "function", function: { name: "assign_process_factors" } }
      );

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error("AI did not return tool call results");
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      const aiResults = parsed.results;

      const finalResults = entries.map((entry: any, i: number) => {
        const aiResult = aiResults.find((r: any) => r.entry_index === i);
        if (!aiResult) {
          return {
            emission_factor: 0,
            tco2e: 0,
            source: "Not determined",
            reasoning: "AI did not provide a factor for this entry",
          };
        }

        const ef = aiResult.emission_factor;
        const tco2e = (entry.massTonnes * ef) / 1000;

        return {
          emission_factor: ef,
          tco2e: parseFloat(tco2e.toFixed(6)),
          source: aiResult.source,
          reasoning: aiResult.reasoning,
        };
      });

      return { data: { results: finalResults }, error: null };
    } catch (err: any) {
      console.error("assign-process-factor error:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  },

  /**
   * classify-suppliers: Classifies uploaded supplier list using Lovable AI and updates Firestore.
   */
  async 'classify-suppliers'(body: any) {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      return { error: { message: "Unauthorized" } };
    }

    const { action } = body;

    const SCOPE3_CATEGORY_CODES = [
      "purchased_goods", "capital_goods", "fuel_energy", "upstream_transport",
      "waste", "business_travel", "employee_commuting", "upstream_leased",
      "downstream_transport", "processing_sold", "use_sold", "end_of_life",
      "downstream_leased", "franchises", "investments",
    ];

    const SCOPE3_CATEGORY_LABELS: Record<string, string> = {
      purchased_goods: "1. Purchased Goods & Services",
      capital_goods: "2. Capital Goods",
      fuel_energy: "3. Fuel & Energy-Related Activities",
      upstream_transport: "4. Upstream Transportation & Distribution",
      waste: "5. Waste Generated in Operations",
      business_travel: "6. Business Travel",
      employee_commuting: "7. Employee Commuting",
      upstream_leased: "8. Upstream Leased Assets",
      downstream_transport: "9. Downstream Transportation",
      processing_sold: "10. Processing of Sold Products",
      use_sold: "11. Use of Sold Products",
      end_of_life: "12. End-of-Life Treatment",
      downstream_leased: "13. Downstream Leased Assets",
      franchises: "14. Franchises",
      investments: "15. Investments",
    };

    try {
      // 1. ACTION: classify
      if (action === "classify") {
        const { suppliers } = body;
        if (!suppliers || suppliers.length === 0) {
          throw new Error("No suppliers provided");
        }

        const systemPrompt = `You are a GHG Protocol Scope 3 carbon accounting classifier. Classify each supplier into exactly one of these 15 Scope 3 categories based on the supplier's name, description, and typical business activity:
  
${Object.entries(SCOPE3_CATEGORY_LABELS).map(([code, label]) => `- "${code}" = ${label}`).join("\n")}
- "review_queue" = Cannot confidently classify

Classification guidance:
- Category 1 (purchased_goods): Raw materials, components, consumables, office supplies, SaaS/software licenses, professional services, consulting, cleaning, catering, IT services
- Category 2 (capital_goods): Machinery, vehicles, buildings, hardware infrastructure, major equipment, furniture with long lifespan, servers
- Category 3 (fuel_energy): Fuel suppliers, energy brokers, gas/electricity not in Scope 1/2
- Category 4 (upstream_transport): Freight, logistics, shipping, warehousing, courier services
- Category 5 (waste): Waste management, recycling services, hazardous waste disposal
- Category 6 (business_travel): Travel agencies, airlines, car rental, hotels, rail services
- Category 7 (employee_commuting): Shuttle services, bike schemes, commute programs
- Category 8 (upstream_leased): Leased office space, equipment rental, co-working
- Category 9 (downstream_transport): Outbound distribution, last-mile delivery
- Category 10 (processing_sold): Contract manufacturers processing your intermediate products
- Category 11 (use_sold): Energy consumed by your products during use
- Category 12 (end_of_life): Product take-back, disposal services
- Category 13 (downstream_leased): Property/assets you lease to others
- Category 14 (franchises): Franchise operations
- Category 15 (investments): Financial investments, equity stakes

For each supplier, provide your confidence (0.0-1.0). Be decisive.`;

        // Batch processing client-side
        const BATCH_SIZE = 50;
        const allResults: any[] = [];

        for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
          const batch = suppliers.slice(i, i + BATCH_SIZE);
          const supplierList = batch
            .map((s: any, idx: number) => `${idx + 1}. Name: "${s.supplier_name}", Description: "${s.description || ""}"`)
            .join("\n");

          const tools = [{
            type: "function",
            function: {
              name: "classify_suppliers",
              description: "Classify each supplier into one of the 15 Scope 3 categories or review_queue",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "integer" },
                        category: { type: "string", enum: [...SCOPE3_CATEGORY_CODES, "review_queue"] },
                        confidence: { type: "number" },
                      },
                      required: ["index", "category", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["classifications"],
                additionalProperties: false,
              },
            },
          }];

          const aiData = await callLovableAI(
            systemPrompt,
            `Classify these ${batch.length} suppliers:\n${supplierList}`,
            tools,
            { type: "function", function: { name: "classify_suppliers" } }
          );

          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          let classifications: any[] = [];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            classifications = parsed.classifications || [];
          }

          const batchResults = batch.map((s: any, idx: number) => {
            const match = classifications.find((c: any) => c.index === idx + 1);
            const category = match?.category || "review_queue";
            const confidence = match?.confidence || 0;
            const autoRouted = confidence >= 0.85 && category !== "review_queue";

            return {
              supplier_name: s.supplier_name,
              description: s.description || "",
              optional_spend: s.optional_spend || "",
              optional_contact: s.optional_contact || "",
              ai_category: category,
              ai_confidence: confidence,
              current_category: autoRouted ? category : "review_queue",
              auto_routed: autoRouted,
            };
          });

          allResults.push(...batchResults);
          if (i + BATCH_SIZE < suppliers.length) {
            await new Promise(r => setTimeout(r, 500)); // Rate limit breathing room
          }
        }

        const classified = allResults.filter((r) => r.auto_routed);
        const reviewQueue = allResults.filter((r) => !r.auto_routed);

        const categoryStats: Record<string, number> = {};
        for (const code of SCOPE3_CATEGORY_CODES) {
          const count = allResults.filter((r) => r.current_category === code).length;
          if (count > 0) categoryStats[code] = count;
        }

        return {
          data: {
            classified,
            review_queue: reviewQueue,
            stats: {
              total: allResults.length,
              auto_classified: classified.length,
              needs_review: reviewQueue.length,
              category_breakdown: categoryStats,
            }
          },
          error: null
        };
      }

      // 2. ACTION: save
      if (action === "save") {
        const { suppliers } = body;
        if (!suppliers || !Array.isArray(suppliers)) throw new Error("No suppliers");

        const allResults: any[] = [];

        for (const s of suppliers) {
          try {
            const nameNormalized = s.supplier_name.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
            const docId = `${currentUserId}_${nameNormalized}`;

            const docRef = doc(db, "suppliers_master", docId);
            const row = {
              user_id: currentUserId,
              name_normalized: nameNormalized,
              name_display: s.supplier_name.trim(),
              description: s.description || null,
              ai_category: s.ai_category,
              ai_confidence: s.ai_confidence,
              user_override_category: s.user_override_category || null,
              current_category: s.user_override_category || s.current_category || s.ai_category,
              last_classified_at: new Date().toISOString(),
            };

            await setDoc(docRef, row);
            allResults.push({ name: s.supplier_name, id: docId, saved: true });
          } catch (err: any) {
            allResults.push({ name: s.supplier_name, error: err.message });
          }
        }

        return {
          data: {
            saved: allResults.filter((r) => r.saved).length,
            errors: allResults.filter((r) => r.error),
            results: allResults,
          },
          error: null
        };
      }

      // 3. ACTION: generate-template
      if (action === "generate-template") {
        const { category } = body;
        if (!SCOPE3_CATEGORY_CODES.includes(category)) throw new Error("Invalid category");

        const masterRef = collection(db, "suppliers_master");
        const q = query(
          masterRef, 
          where("user_id", "==", currentUserId),
          where("current_category", "==", category),
          orderBy("name_display")
        );

        const snap = await getDocs(q);
        const suppliersList: any[] = [];
        snap.forEach(docSnap => {
          suppliersList.push({ id: docSnap.id, ...docSnap.data() });
        });

        return { data: { suppliers: suppliersList, category }, error: null };
      }

      // 4. ACTION: reimport
      if (action === "reimport") {
        const { entries, category } = body;
        if (!entries || !Array.isArray(entries)) throw new Error("No entries");
        if (!SCOPE3_CATEGORY_CODES.includes(category)) throw new Error("Invalid category");

        // Fetch all master suppliers for this user
        const masterRef = collection(db, "suppliers_master");
        const q = query(masterRef, where("user_id", "==", currentUserId));
        const snap = await getDocs(q);
        const master: any[] = [];
        snap.forEach(d => master.push({ id: d.id, ...d.data() }));

        const imported: any[] = [];
        const mismatches: any[] = [];
        const newClassified: any[] = [];

        for (const entry of entries) {
          const nameNormalized = entry.supplier_name.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
          const existing = master.find((m: any) => m.name_normalized === nameNormalized);

          if (existing) {
            if (existing.current_category === category) {
              try {
                if (category === "purchased_goods") {
                  await addDoc(collection(db, "supplier_data_pg"), {
                    supplier_id: existing.id, 
                    user_id: currentUserId,
                    reporting_year: entry.reporting_year || new Date().getFullYear(),
                    spend_usd: entry.spend_usd || null, 
                    quantity: entry.quantity || null,
                    unit: entry.unit || null, 
                    emission_factor_id: entry.emission_factor_id || null,
                    tco2e: entry.tco2e || null,
                  });
                } else if (category === "capital_goods") {
                  await addDoc(collection(db, "supplier_data_cg"), {
                    supplier_id: existing.id, 
                    user_id: currentUserId,
                    reporting_year: entry.reporting_year || new Date().getFullYear(),
                    asset_value_usd: entry.asset_value_usd || null,
                    lifespan_years: entry.lifespan_years || null,
                    purchase_date: entry.purchase_date || null,
                    emission_factor_id: entry.emission_factor_id || null,
                    tco2e: entry.tco2e || null,
                  });
                }
                imported.push({ supplier_name: entry.supplier_name, status: "imported" });
              } catch (err: any) {
                imported.push({ supplier_name: entry.supplier_name, status: "error", error: err.message });
              }
            } else {
              mismatches.push({ supplier_name: entry.supplier_name, expected: existing.current_category, got: category });
            }
          } else {
            // Create new master supplier and insert spend data
            try {
              const newDocId = `${currentUserId}_${nameNormalized}`;
              const newSupRef = doc(db, "suppliers_master", newDocId);
              
              await setDoc(newSupRef, {
                user_id: currentUserId,
                name_normalized: nameNormalized,
                name_display: entry.supplier_name.trim(),
                description: entry.description || null,
                ai_category: category,
                ai_confidence: 0,
                current_category: category,
                last_classified_at: new Date().toISOString(),
              });

              newClassified.push({ supplier_name: entry.supplier_name, category });

              if (category === "purchased_goods") {
                await addDoc(collection(db, "supplier_data_pg"), {
                  supplier_id: newDocId, 
                  user_id: currentUserId,
                  reporting_year: entry.reporting_year || new Date().getFullYear(),
                  spend_usd: entry.spend_usd || null, 
                  quantity: entry.quantity || null,
                  unit: entry.unit || null, 
                  tco2e: entry.tco2e || null,
                });
              } else if (category === "capital_goods") {
                await addDoc(collection(db, "supplier_data_cg"), {
                  supplier_id: newDocId, 
                  user_id: currentUserId,
                  reporting_year: entry.reporting_year || new Date().getFullYear(),
                  asset_value_usd: entry.asset_value_usd || null,
                  lifespan_years: entry.lifespan_years || null,
                  purchase_date: entry.purchase_date || null,
                  tco2e: entry.tco2e || null,
                });
              }
            } catch (err: any) {
              console.error("Reimport new supplier error:", err);
            }
          }
        }

        return {
          data: {
            imported: imported.filter((i: any) => i.status === "imported").length,
            mismatches, 
            new_classified: newClassified.length,
            details: { imported, mismatches, newClassified }
          },
          error: null
        };
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (err: any) {
      console.error("classify-suppliers error:", err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  }
};
