// Generador de recetas sin conexión: reconoce tus ingredientes, filtra por sabor y puntúa por momento del día.
const ING = {
    macarron: ['pasta', 'macarron', 'espagueti', 'spaghetti', 'fideo', 'penne', 'fusilli', 'tallarin'],
    arroz: ['arroz'], huevo: ['huevo'], atun: ['atun', 'bonito'], tomate: ['tomate'],
    queso: ['queso', 'mozzarella', 'parmesano', 'feta', 'requeson'], leche: ['leche'], bacon: ['bacon', 'beicon', 'panceta'],
    jamon: ['jamon', 'york', 'serrano'], pavo: ['pavo'], pollo: ['pollo'],
    carne: ['ternera', 'cerdo', 'carne', 'hamburguesa', 'lomo', 'salchicha'],
    pescado: ['salmon', 'merluza', 'bacalao', 'dorada', 'lubina', 'pescado', 'gamba', 'langostino'],
    pan: ['pan', 'tostada', 'baguette', 'pita'], wrap: ['wrap', 'tortilla de trigo'], avena: ['avena', 'copos'],
    yogur: ['yogur', 'yogurt', 'skyr', 'kefir'], platano: ['platano', 'banana'], manzana: ['manzana'],
    fruta: ['fruta', 'fresa', 'pera', 'naranja', 'mandarina', 'kiwi', 'melocoton', 'uva', 'arandano', 'mango', 'pina'],
    frutos_secos: ['almendra', 'nuez', 'nueces', 'anacardo', 'cacahuete', 'pistacho', 'avellana', 'frutos secos'],
    miel: ['miel', 'sirope'], cacao: ['cacao', 'chocolate'], patata: ['patata', 'papa', 'boniato'],
    cebolla: ['cebolla', 'puerro'], pimiento: ['pimiento'], champi: ['champinon', 'seta', 'hongo'],
    verdura: ['lechuga', 'espinaca', 'canonigo', 'rucula', 'ensalada'], zanahoria: ['zanahoria'],
    calabacin: ['calabacin', 'berenjena'], legumbre: ['lenteja', 'garbanzo', 'judia', 'alubia', 'frijol'],
    aguacate: ['aguacate'], harina: ['harina'], canela: ['canela'], maiz: ['maiz'],
    tofu: ['tofu'], quinoa: ['quinoa'], cuscus: ['cuscus', 'cous cous'], hummus: ['hummus', 'humus'], chia: ['chia']
};
const SHOW = { macarron: 'pasta', pescado: 'pescado', frutos_secos: 'frutos secos', champi: 'champiñones', calabacin: 'calabacín', verdura: 'verdura/ensalada', legumbre: 'legumbres', wrap: 'wraps', atun: 'atún', platano: 'plátano', jamon: 'jamón' };
const show = k => SHOW[k] || k;
const MEAL_NAME = { morn: 'la media mañana', lunch: 'la comida', snack: 'la merienda', dinner: 'la cena' };

// r = ingredientes obligatorios ('a|b' = vale cualquiera), o = opcionales, x = toque extra si tienes ese opcional
const RECIPES = [
    { n: 'Macarrones gratinados de atún y tomate', m: 'lunch dinner', f: 's', r: ['macarron', 'atun', 'tomate'], o: ['queso', 'cebolla', 'huevo'], t: '25 min', g: 'Saciante',
      s: ['Cuece 70-80 g de pasta por persona, al dente.', 'Sofríe el tomate con una pizca de sal y mézclalo con el atún escurrido.', 'Junta con la pasta y gratina 5 min.'],
      x: { queso: 'Cubre con queso rallado antes de gratinar.', cebolla: 'Pocha media cebolla picada antes del tomate.', huevo: 'Añade un huevo cocido picado por encima.' } },
    { n: 'Macarrones a la carbonara ligera', m: 'lunch dinner', f: 's', r: ['macarron', 'huevo', 'bacon|jamon'], o: ['queso', 'leche'], t: '20 min', g: 'Energético',
      s: ['Cuece la pasta y guarda un vaso del agua de cocción.', 'Dora el bacon (o jamón) en dados en sartén sin aceite.', 'Fuera del fuego, mezcla pasta, bacon y 1-2 huevos batidos con un chorrito del agua hasta que quede cremoso.'],
      x: { queso: 'Añade queso rallado a los huevos batidos.', leche: 'Sustituye la nata por un chorrito de leche.' } },
    { n: 'Arroz con tomate, atún y huevo', m: 'lunch dinner', f: 's', r: ['arroz', 'tomate', 'atun|huevo'], o: ['cebolla', 'pimiento', 'maiz'], t: '25 min', g: 'Saciante',
      s: ['Cuece 60-70 g de arroz por persona.', 'Sofríe el tomate 8 min.', 'Mezcla con el arroz y añade el atún y/o un huevo frito o cocido encima.'],
      x: { cebolla: 'Pocha cebolla picada antes del tomate.', pimiento: 'Sofríe pimiento en tiras con el tomate.', maiz: 'Añade maíz al final.' } },
    { n: 'Arroz salteado con huevo', m: 'lunch dinner', f: 's', r: ['arroz', 'huevo'], o: ['bacon', 'jamon', 'zanahoria', 'pimiento', 'verdura', 'maiz', 'pollo'], t: '15 min', g: 'Rápido',
      s: ['Usa arroz cocido del día anterior (o cuécelo y escúrrelo bien).', 'Saltea en sartén muy caliente lo que tengas, 3-4 min.', 'Añade el arroz, haz un hueco, revuelve los huevos y mezcla todo.'],
      x: { bacon: 'Dora primero el bacon: aporta sabor.', verdura: 'Corta la verdura fina para que quede crujiente.' } },
    { n: 'Tortilla de atún y queso', m: 'morn lunch snack dinner', f: 's', r: ['huevo', 'atun'], o: ['queso', 'tomate', 'cebolla'], t: '10 min', g: 'Proteico',
      s: ['Bate 2-3 huevos con sal y mezcla el atún escurrido.', 'Cuaja en sartén antiadherente a fuego medio, 2-3 min por lado.'],
      x: { queso: 'Pon queso en el centro y dobla la tortilla.', tomate: 'Sirve con rodajas de tomate aliñadas.' } },
    { n: 'Tortilla francesa de bacon y queso', m: 'morn lunch dinner', f: 's', r: ['huevo', 'bacon|queso'], o: ['tomate', 'pan'], t: '10 min', g: 'Proteico',
      s: ['Dora el bacon en dados y resérvalo (si lo tienes).', 'Cuaja 2 huevos batidos, rellena con bacon y/o queso y dobla.'],
      x: { pan: 'Acompaña con una tostada integral.', tomate: 'Sirve con tomate en rodajas.' } },
    { n: 'Huevos revueltos con tomate', m: 'morn lunch dinner', f: 's', r: ['huevo', 'tomate'], o: ['bacon', 'queso', 'cebolla', 'pan'], t: '10 min', g: 'Rápido',
      s: ['Sofríe el tomate rallado o en dados 5 min con una pizca de sal.', 'Añade los huevos batidos y remueve a fuego suave hasta que cuajen cremosos.'],
      x: { bacon: 'Dora bacon en dados antes del tomate.', queso: 'Termina con queso rallado.', pan: 'Sirve sobre una tostada.' } },
    { n: 'Ensalada de pasta con atún', m: 'lunch dinner snack', f: 's', r: ['macarron', 'atun'], o: ['tomate', 'huevo', 'maiz', 'verdura', 'aguacate'], t: '15 min', g: 'Fresco',
      s: ['Cuece la pasta, enfríala bajo el grifo y escúrrela.', 'Mezcla con el atún y lo que tengas en crudo.', 'Aliña con aceite, sal y un chorrito de limón o vinagre.'],
      x: { huevo: 'Añade huevo cocido troceado.', aguacate: 'Pon aguacate en dados al final.' } },
    { n: 'Pasta al horno con tomate y queso', m: 'lunch dinner', f: 's', r: ['macarron', 'tomate', 'queso'], o: ['bacon', 'atun', 'carne', 'cebolla'], t: '30 min', g: 'Reconfortante',
      s: ['Cuece la pasta y mézclala con tomate sofrito.', 'Pásala a una fuente, cubre de queso y hornea 10-12 min a 200 ºC.'],
      x: { bacon: 'Mezcla bacon dorado con la pasta.', atun: 'Añade atún escurrido al tomate.', carne: 'Sofríe la carne picada con el tomate.' } },
    { n: 'Ensalada de huevo duro, tomate y atún', m: 'snack dinner lunch', f: 's', r: ['huevo', 'tomate', 'atun'], o: ['aguacate', 'verdura', 'maiz', 'cebolla'], t: '12 min', g: 'Ligero',
      s: ['Cuece los huevos 10 min y pélalos.', 'Trocea tomate y huevo, añade el atún y aliña con aceite y sal.'], x: { aguacate: 'Suma aguacate en láminas.', verdura: 'Sírvelo sobre una cama de hojas verdes.' } },
    { n: 'Tostada de tomate con queso o jamón', m: 'morn snack', f: 's', r: ['pan', 'tomate|queso|jamon|pavo|aguacate'], o: ['tomate', 'queso', 'jamon', 'pavo', 'aguacate', 'huevo'], t: '5 min', g: 'Rápido',
      s: ['Tuesta el pan.', 'Unta tomate triturado con un hilo de aceite y añade lo que tengas encima.'], x: { huevo: 'Corona con un huevo a la plancha.' } },
    { n: 'Sándwich a la plancha de queso y bacon', m: 'morn snack dinner', f: 's', r: ['pan', 'queso', 'bacon|jamon|pavo|pollo'], o: ['tomate'], t: '8 min', g: 'Reconfortante',
      s: ['Rellena el pan con queso y el embutido o bacon dorado.', 'Dóralo en sartén o sandwichera 2-3 min por lado.'], x: { tomate: 'Añade una rodaja de tomate.' } },
    { n: 'Tostada con huevo a la plancha', m: 'morn dinner', f: 's', r: ['pan', 'huevo'], o: ['aguacate', 'tomate', 'queso', 'jamon', 'bacon'], t: '8 min', g: 'Proteico',
      s: ['Tuesta el pan.', 'Haz el huevo a la plancha con poco aceite y colócalo encima.'], x: { aguacate: 'Pon aguacate machacado debajo del huevo.', bacon: 'Añade bacon crujiente.' } },
    { n: 'Pollo al horno con patatas', m: 'lunch dinner', f: 's', r: ['pollo', 'patata'], o: ['cebolla', 'pimiento', 'zanahoria'], t: '45 min', g: 'Proteico',
      s: ['Corta patatas (y verduras) en rodajas gruesas en una bandeja.', 'Pon el pollo encima con sal, pimienta y aceite.', 'Hornea 35-40 min a 200 ºC.'], x: { cebolla: 'Añade cebolla en juliana.', pimiento: 'Añade pimiento en tiras.' } },
    { n: 'Pollo salteado con arroz', m: 'lunch dinner', f: 's', r: ['pollo', 'arroz'], o: ['pimiento', 'cebolla', 'zanahoria', 'champi', 'verdura'], t: '25 min', g: 'Proteico',
      s: ['Cuece el arroz.', 'Saltea el pollo en tiras y las verduras a fuego fuerte.', 'Mezcla con el arroz y ajusta de sal.'], x: { champi: 'Los champiñones laminados van muy bien aquí.' } },
    { n: 'Salteado de verduras con huevo', m: 'dinner lunch', f: 's', r: ['huevo', 'calabacin|pimiento|champi|cebolla|zanahoria|verdura'], o: ['calabacin', 'pimiento', 'champi', 'cebolla', 'zanahoria', 'jamon', 'bacon', 'queso'], t: '15 min', g: 'Ligero',
      s: ['Corta las verduras y saltéalas 6-8 min.', 'Añade los huevos batidos y remueve hasta que cuajen.'], x: { jamon: 'Añade jamón en tacos.', queso: 'Termina con queso rallado.' } },
    { n: 'Guiso rápido de legumbres', m: 'lunch', f: 's', r: ['legumbre'], o: ['patata', 'zanahoria', 'cebolla', 'bacon', 'tomate', 'pimiento'], t: '30 min', g: 'Saciante',
      s: ['Sofríe cebolla y verduras con un poco de tomate.', 'Añade las legumbres cocidas, cubre con agua y cuece 15-20 min.'], x: { bacon: 'Dora un poco de bacon al inicio para dar sabor.', patata: 'Añade patata en dados para que espese.' } },
    { n: 'Ensalada completa', m: 'lunch dinner', f: 's', r: ['verdura', 'atun|huevo|pollo|pavo|queso|jamon'], o: ['tomate', 'aguacate', 'maiz', 'zanahoria', 'cebolla', 'atun', 'huevo', 'queso'], t: '10 min', g: 'Ligero',
      s: ['Lava y trocea las hojas con lo que tengas en crudo.', 'Añade la proteína y aliña con aceite, sal y limón.'], x: { huevo: 'Añade un huevo cocido.', aguacate: 'Suma aguacate en láminas.' } },
    { n: 'Crema de verduras', m: 'dinner', f: 's', r: ['patata|calabacin|zanahoria|cebolla|verdura'], o: ['patata', 'calabacin', 'zanahoria', 'cebolla', 'queso', 'leche', 'huevo'], t: '25 min', g: 'Ligero',
      s: ['Cuece las verduras troceadas 15-20 min con agua y sal.', 'Tritura y ajusta la textura con el caldo de cocción.'], x: { queso: 'Añade un triangulito de queso al triturar.', leche: 'Un chorrito de leche la deja más cremosa.', huevo: 'Sirve con un huevo cocido picado.' } },
    { n: 'Pescado a la plancha con guarnición', m: 'lunch dinner', f: 's', r: ['pescado'], o: ['patata', 'verdura', 'tomate', 'calabacin', 'pimiento'], t: '15 min', g: 'Proteico',
      s: ['Dora el pescado en plancha caliente 3-4 min por lado con sal.', 'Acompaña con verduras salteadas o patata cocida.'], x: { tomate: 'Sirve con tomate aliñado.', patata: 'Haz la patata cocida o al microondas.' } },
    { n: 'Wrap de pollo, pavo o atún', m: 'lunch dinner snack', f: 's', r: ['wrap', 'pollo|pavo|atun|jamon'], o: ['verdura', 'tomate', 'queso', 'aguacate', 'huevo'], t: '10 min', g: 'Práctico',
      s: ['Calienta el wrap 20 segundos.', 'Rellena con la proteína y lo que tengas en crudo, y enrolla.'], x: { aguacate: 'Unta aguacate en lugar de salsa.', queso: 'Añade queso fundido.' } },
    { n: 'Patatas con huevo', m: 'lunch dinner', f: 's', r: ['patata', 'huevo'], o: ['bacon', 'jamon', 'cebolla', 'pimiento'], t: '25 min', g: 'Saciante',
      s: ['Cuece o fríe en poco aceite las patatas en rodajas.', 'Coloca encima los huevos a la plancha y rompe la yema para mezclar.'], x: { bacon: 'Añade bacon crujiente por encima.', jamon: 'Añade jamón en tacos.' } },
    { n: 'Revuelto de champiñones', m: 'morn dinner lunch', f: 's', r: ['huevo', 'champi'], o: ['jamon', 'bacon', 'cebolla', 'queso'], t: '12 min', g: 'Ligero',
      s: ['Saltea los champiñones laminados hasta que suelten el agua.', 'Añade los huevos batidos y remueve hasta que cuajen.'], x: { jamon: 'Añade jamón en tacos.', cebolla: 'Pocha cebolla antes de los champiñones.' } },
    { n: 'Bocadillo de atún con tomate', m: 'morn snack dinner', f: 's', r: ['pan', 'atun'], o: ['tomate', 'huevo', 'aguacate', 'verdura', 'queso'], t: '5 min', g: 'Práctico',
      s: ['Mezcla el atún escurrido con tomate triturado.', 'Rellena el pan y completa con lo que tengas.'], x: { huevo: 'Añade huevo cocido en rodajas.', verdura: 'Pon hojas verdes para dar frescor.' } },
    { n: 'Tofu salteado con verduras', m: 'lunch dinner', f: 's', r: ['tofu'], o: ['calabacin', 'pimiento', 'champi', 'cebolla', 'zanahoria', 'arroz', 'verdura'], t: '15 min', g: 'Vegetal',
      s: ['Seca el tofu y córtalo en dados; dóralo en sartén con poco aceite hasta que esté crujiente.', 'Saltea las verduras a fuego fuerte y mezcla con el tofu.'], x: { arroz: 'Sírvelo sobre arroz cocido.', champi: 'Los champiñones aportan mucho sabor.' } },
    { n: 'Quinoa con verduras y huevo', m: 'lunch dinner', f: 's', r: ['quinoa', 'huevo|calabacin|pimiento|champi|tomate'], o: ['calabacin', 'pimiento', 'tomate', 'cebolla', 'aguacate', 'queso'], t: '20 min', g: 'Completo',
      s: ['Lava la quinoa y cuécela 12-15 min con doble de agua.', 'Saltea las verduras y mézclalas con la quinoa; corona con un huevo a la plancha.'], x: { aguacate: 'Añade aguacate en dados.', queso: 'Termina con queso rallado.' } },
    { n: 'Cuscús con verduras y proteína', m: 'lunch dinner', f: 's', r: ['cuscus'], o: ['pollo', 'atun', 'pavo', 'calabacin', 'pimiento', 'tomate', 'cebolla'], t: '12 min', g: 'Rápido',
      s: ['Cubre el cuscús con agua caliente (mismo volumen), tapa 5 min y suelta con un tenedor.', 'Saltea verduras y proteína y mézclalo todo.'], x: { atun: 'Añade atún escurrido al final.', pollo: 'Saltea el pollo en dados antes que las verduras.' } },
    { n: 'Tostada de hummus con verduras', m: 'morn snack lunch', f: 's', r: ['pan', 'hummus'], o: ['tomate', 'verdura', 'zanahoria', 'huevo', 'aguacate'], t: '5 min', g: 'Vegetal',
      s: ['Tuesta el pan y unta el hummus.', 'Cubre con verduras en láminas.'], x: { huevo: 'Añade huevo cocido en rodajas.', aguacate: 'Suma aguacate para más saciedad.' } },
    { n: 'Bol de legumbres con atún', m: 'lunch dinner', f: 's', r: ['legumbre', 'atun'], o: ['tomate', 'cebolla', 'huevo', 'aguacate', 'verdura', 'pimiento'], t: '10 min', g: 'Proteico',
      s: ['Escurre y enjuaga las legumbres.', 'Mézclalas con el atún y las verduras en crudo y aliña con aceite, sal y limón.'], x: { huevo: 'Añade huevo cocido.', aguacate: 'Pon aguacate en dados.' } },
    { n: 'Calabacín o berenjena gratinados', m: 'lunch dinner', f: 's', r: ['calabacin', 'queso'], o: ['tomate', 'pavo', 'jamon', 'carne', 'cebolla'], t: '30 min', g: 'Ligero',
      s: ['Corta las verduras en rodajas o abiertas por la mitad y hornéalas 15 min a 200 ºC.', 'Cubre con tomate, queso y lo que tengas y gratina 5-8 min.'], x: { pavo: 'Rellénalas con pavo salteado.', carne: 'Rellénalas con carne picada sofrita.' } },
    { n: 'Carne a la plancha con patatas', m: 'lunch dinner', f: 's', r: ['carne', 'patata'], o: ['pimiento', 'cebolla', 'verdura', 'tomate'], t: '25 min', g: 'Proteico',
      s: ['Cuece o asa las patatas en rodajas.', 'Haz la carne a la plancha 3-4 min por lado y sirve con ensalada.'], x: { pimiento: 'Asa pimientos de acompañamiento.' } },
    { n: 'Revuelto de gambas o pescado', m: 'dinner lunch', f: 's', r: ['huevo', 'pescado'], o: ['champi', 'cebolla', 'calabacin', 'pan'], t: '12 min', g: 'Ligero',
      s: ['Saltea el pescado o las gambas troceadas 2-3 min.', 'Añade los huevos batidos y remueve hasta que cuajen.'], x: { champi: 'Saltea champiñones antes.', pan: 'Acompaña con una tostada.' } },
    { n: 'Pasta con verduras salteadas', m: 'lunch dinner', f: 's', r: ['macarron', 'calabacin|pimiento|champi|cebolla|verdura|tomate'], o: ['queso', 'atun', 'pollo', 'calabacin', 'pimiento', 'champi', 'tomate'], t: '20 min', g: 'Saciante',
      s: ['Cuece la pasta al dente.', 'Saltea las verduras a fuego fuerte y mézclalas con la pasta y un chorrito del agua de cocción.'], x: { queso: 'Termina con queso rallado.', atun: 'Añade atún escurrido.', pollo: 'Saltea pollo en tiras con las verduras.' } },
    { n: 'Tortilla de patatas', m: 'lunch dinner morn', f: 's', r: ['huevo', 'patata'], o: ['cebolla', 'pimiento', 'jamon'], t: '25 min', g: 'Clásico',
      s: ['Pocha la patata en rodajas finas (y cebolla) en poco aceite hasta que esté blanda.', 'Mézclala con los huevos batidos y cuaja por ambos lados.'], x: { cebolla: 'Con cebolla queda más jugosa.', jamon: 'Añade tacos de jamón.' } },
    { n: 'Pollo al yogur', m: 'lunch dinner', f: 's', r: ['pollo', 'yogur'], o: ['arroz', 'cebolla', 'pimiento', 'patata'], t: '25 min', g: 'Tierno',
      s: ['Marina el pollo en dados con yogur, sal y especias 10 min (o más).', 'Dóralo en sartén o al horno y sírvelo con arroz o patata.'], x: { arroz: 'Acompaña con arroz cocido.', cebolla: 'Dora cebolla con el pollo.' } },
    // ----- DULCES -----
    { n: 'Arroz con leche exprés', m: 'snack dinner morn', f: 'd', r: ['arroz', 'leche'], o: ['canela', 'miel', 'platano', 'manzana', 'cacao'], t: '20 min', g: 'Anti-ansiedad',
      s: ['Calienta 1 vaso de leche con 3-4 cucharadas de arroz cocido a fuego bajo.', 'Remueve 8-10 min hasta que espese.', 'Endulza al gusto, sin azúcar añadido.'], x: { canela: 'Espolvorea canela.', miel: 'Endulza con un hilo de miel.', platano: 'Machaca medio plátano dentro para endulzar.', cacao: 'Añade una cucharadita de cacao.' } },
    { n: 'Porridge de avena', m: 'morn dinner snack', f: 'd', r: ['avena', 'leche|yogur'], o: ['platano', 'canela', 'frutos_secos', 'miel', 'cacao', 'fruta', 'manzana'], t: '4 min', g: 'Anti-ansiedad',
      s: ['Calienta 3 cucharadas soperas de avena con 1 vaso de leche 1,5 min al microondas (o en cazo).', 'Remueve y añade lo que tengas por encima.'], x: { platano: 'Corta plátano en rodajas encima.', canela: 'Termina con canela.', frutos_secos: 'Pica unos frutos secos por encima.', cacao: 'Mezcla cacao puro.' } },
    { n: 'Yogur proteico con fruta y frutos secos', m: 'snack morn dinner', f: 'd', r: ['yogur'], o: ['fruta', 'platano', 'manzana', 'avena', 'frutos_secos', 'miel', 'cacao'], t: '2 min', g: 'Proteico',
      s: ['Pon el yogur en un bol.', 'Añade la fruta troceada y un toque crujiente por encima.'], x: { avena: 'Añade una cucharada de avena.', frutos_secos: 'Suma un puñado pequeño de frutos secos.', miel: 'Un hilo de miel basta.' } },
    { n: 'Tortitas de plátano y huevo', m: 'morn snack', f: 'd', r: ['platano', 'huevo'], o: ['avena', 'canela', 'cacao', 'leche', 'yogur', 'miel'], t: '10 min', g: 'Energético',
      s: ['Machaca 1 plátano maduro y mézclalo con 2 huevos.', 'Cuaja cucharadas de masa en sartén antiadherente 1-2 min por lado.'], x: { avena: 'Añade 2 cucharadas de avena para más cuerpo.', canela: 'Aromatiza con canela.', yogur: 'Sírvelas con yogur.' } },
    { n: 'Natillas caseras ligeras', m: 'snack dinner', f: 'd', r: ['leche', 'huevo'], o: ['canela', 'cacao', 'miel', 'platano'], t: '15 min', g: 'Anti-ansiedad',
      s: ['Calienta 1 vaso de leche sin que hierva.', 'Bate 1 huevo con 1 cucharada de miel (o plátano machacado) y añade la leche poco a poco.', 'Vuelve al fuego bajo removiendo hasta que espese, sin hervir. Enfría en nevera.'], x: { canela: 'Espolvorea canela al servir.', cacao: 'Añade cacao puro para unas natillas de chocolate.' } },
    { n: 'Batido de plátano y leche', m: 'morn snack', f: 'd', r: ['platano', 'leche'], o: ['avena', 'cacao', 'yogur', 'canela', 'miel'], t: '2 min', g: 'Energético',
      s: ['Tritura 1 plátano con 1 vaso de leche fría.', 'Añade lo que tengas y vuelve a triturar.'], x: { avena: 'Una cucharada de avena lo hace más saciante.', cacao: 'Con cacao sabe a batido de chocolate.' } },
    { n: 'Macedonia con yogur', m: 'snack dinner', f: 'd', r: ['fruta|manzana|platano'], o: ['yogur', 'miel', 'frutos_secos', 'avena', 'canela'], t: '5 min', g: 'Ligero',
      s: ['Trocea toda la fruta en dados.', 'Mezcla y añade un toque cremoso o crujiente.'], x: { yogur: 'Cubre con yogur natural.', frutos_secos: 'Termina con frutos secos picados.' } },
    { n: 'Manzana asada al microondas', m: 'snack dinner', f: 'd', r: ['manzana'], o: ['canela', 'avena', 'miel', 'frutos_secos', 'yogur'], t: '5 min', g: 'Anti-ansiedad',
      s: ['Quita el corazón a la manzana y ponla en un plato.', 'Microondas 3-4 min hasta que esté blanda.'], x: { canela: 'Espolvorea canela.', avena: 'Rellena el hueco con avena.', yogur: 'Sírvela con yogur.' } },
    { n: 'Torrijas al horno', m: 'snack morn dinner', f: 'd', r: ['pan', 'leche', 'huevo'], o: ['canela', 'miel'], t: '20 min', g: 'Reconfortante',
      s: ['Empapa rebanadas de pan en leche y luego en huevo batido.', 'Hornea 12-15 min a 200 ºC dándoles la vuelta a mitad.'], x: { canela: 'Espolvorea canela.', miel: 'Termina con un hilo de miel.' } },
    { n: 'Bol de yogur con chía y fruta', m: 'morn snack', f: 'd', r: ['yogur', 'chia'], o: ['fruta', 'platano', 'manzana', 'miel', 'avena', 'frutos_secos'], t: '3 min', g: 'Saciante',
      s: ['Mezcla el yogur con una cucharada de chía y deja reposar 5 min.', 'Añade la fruta por encima.'], x: { avena: 'Suma una cucharada de avena.', frutos_secos: 'Termina con frutos secos.' } },
    { n: 'Pudin de chía', m: 'morn snack dinner', f: 'd', r: ['chia', 'leche|yogur'], o: ['platano', 'fruta', 'cacao', 'miel', 'canela', 'manzana'], t: '5 min + reposo', g: 'Anti-ansiedad',
      s: ['Mezcla 3 cucharadas de chía con 1 vaso de leche (o yogur).', 'Reposa 2 h en la nevera (o toda la noche) y añade fruta.'], x: { cacao: 'Añade cacao para un pudin de chocolate.', platano: 'Machaca plátano dentro para endulzar.' } },
    { n: 'Tostada de crema de frutos secos y plátano', m: 'morn snack', f: 'd', r: ['pan', 'frutos_secos'], o: ['platano', 'manzana', 'miel', 'cacao', 'canela'], t: '5 min', g: 'Energético',
      s: ['Tuesta el pan y unta crema de cacahuete o almendra fina.', 'Cubre con rodajas de plátano o manzana.'], x: { canela: 'Espolvorea canela.', miel: 'Un hilo de miel si lo necesitas.' } },
    { n: 'Plátano con chocolate negro', m: 'snack dinner', f: 'd', r: ['platano', 'cacao'], o: ['frutos_secos', 'yogur', 'canela', 'avena'], t: '5 min', g: 'Anti-ansiedad',
      s: ['Corta el plátano en rodajas.', 'Derrite 2-3 onzas de chocolate negro 30 s en microondas y báñalo.'], x: { frutos_secos: 'Termina con frutos secos picados.', yogur: 'Sírvelo con yogur.' } },
    { n: 'Gachas de quinoa dulces', m: 'morn snack', f: 'd', r: ['quinoa', 'leche'], o: ['canela', 'platano', 'manzana', 'fruta', 'miel', 'frutos_secos'], t: '15 min', g: 'Reconfortante',
      s: ['Cuece la quinoa en leche a fuego bajo 12-15 min hasta que espese.', 'Sirve con la fruta y canela.'], x: { canela: 'Espolvorea canela.', frutos_secos: 'Añade frutos secos picados.' } }
];

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const aliasHit = (tok, a) => a.includes(' ') ? tok.includes(a)
    : tok.split(/[^a-z0-9]+/).some(w => w === a || w === a + 's' || w === a + 'es' || (a.length >= 5 && w.startsWith(a)));

function parseIngredients(raw) {
    const have = new Set(), unknown = [];
    norm(raw).split(/[,;\n+]| y /).map(t => t.trim()).filter(Boolean).forEach(tok => {
        const keys = Object.keys(ING).filter(k => ING[k].some(a => aliasHit(tok, a)));
        keys.forEach(k => have.add(k));
        if (!keys.length) unknown.push(tok);
    });
    return { have, unknown };
}

function suggestRecipes(raw, goal, flavor) {
    const { have, unknown } = parseIngredients(raw), f = flavor === 'dulce' ? 'd' : 's', list = [];
    RECIPES.filter(r => r.f === f).forEach(r => {
        const groups = r.r.map(g => g.split('|'));
        const hit = groups.map(g => g.find(k => have.has(k)));
        const missing = groups.filter((g, i) => !hit[i]);
        if (missing.length > 1) return; // como mucho te puede faltar 1 ingrediente base
        const opt = r.o.filter(k => have.has(k)), used = [...new Set([...hit.filter(Boolean), ...opt])];
        const fits = r.m.split(' ').includes(goal);
        const score = used.length * 2 + (have.size ? used.length / have.size * 4 : 0) + (fits ? 5 : 0) - missing.length * 6;
        list.push({ r, used, opt, fits, score, missing: missing.map(g => g.map(show).join(' o ')) });
    });
    list.sort((a, b) => b.score - a.score);
    return { have, unknown, list };
}
