/* Catálogo verificado no Catálogo CFI do BNDES (gateway público catalogoCFI) em 14/10/2026. Preços: só os que vieram de proposta. */
var CAT_FONTE = "Catálogo CFI do BNDES, consulta de 14/10/2026";
var CATALOGO_VMI = [
  { id: "cignus600", fabricante: "VMI Médica (VMI Tecnologias Ltda)", cnpj: "02.659.246/0001-03", modelo: "Cignus 600 1,5T (24 canais)", modalidade: "rm_15t", cfi: "04252454", ncm: "9018.13.00", preco: 4329000, origem: "nacional", fonte: CAT_FONTE + "; preço: contrato FINAME CEMAN" },
  { id: "aquila320s", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Aquila 320 S (RX móvel)", modalidade: "rx_movel", cfi: "03538400", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "aquila320d", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Aquila 320 D (RX móvel digital)", modalidade: "rx_movel", cfi: "03538253", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "aquila500s", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Aquila 500 S (RX móvel)", modalidade: "rx_movel", cfi: "04290476", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "aquila500d", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Aquila 500 D (RX móvel digital)", modalidade: "rx_movel", cfi: "04279825", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "apolos", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Apolo S (RX fixo)", modalidade: "rx_dr", cfi: "03538399", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "apolod", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Apolo D (RX fixo digital)", modalidade: "rx_dr", cfi: "03538246", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "apolodrf", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Apolo DRF (RX telecomandado)", modalidade: "rx_dr", cfi: "03989142", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "digimamos", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Digimamo S (mamografia)", modalidade: "mamografia", cfi: "03538260", ncm: "9022.14.11", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "digimamod", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Digimamo D (mamografia digital)", modalidade: "mamografia", cfi: "03538417", ncm: "9022.14.11", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "digimamotm", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Digimamo TM (mamografia)", modalidade: "mamografia", cfi: "03902575", ncm: "9022.14.11", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "digimamotm3d", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Digimamo TM 3D (tomossíntese)", modalidade: "mamografia", cfi: "04267577", ncm: "9022.14.11", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "fenixfaf", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Fênix FAF (arco cirúrgico)", modalidade: "arco", cfi: "03902582", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "fenixfag", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Fênix FAG (arco cirúrgico)", modalidade: "arco", cfi: "04256011", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "centauros", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Centauro S (RX veterinário)", modalidade: "rx_dr", cfi: "03893005", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "centaurod", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Centauro D (RX veterinário digital)", modalidade: "rx_dr", cfi: "03902778", ncm: "9022.14.19", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "pulsar128", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Pulsar 128 (TC 64 canais / 128 cortes)", modalidade: "tc", cfi: "", ncm: "9022.12.00", preco: null, origem: "nacional", fonte: "NÃO CONSTA no Catálogo CFI em 14/10/2026 (nem Pulsar 32/64). Credenciar antes de ofertar FINAME; até lá, só linhas sem CFI." },
  { id: "pulsar64", fabricante: "VMI Médica", cnpj: "02.659.246/0001-03", modelo: "Pulsar 64 (TC 32 canais / 64 cortes)", modalidade: "tc", cfi: "", ncm: "9022.12.00", preco: null, origem: "nacional", fonte: "Não consta no Catálogo CFI em 14/10/2026." },
  { id: "dominusl1", fabricante: "Alfa Med Sistemas Médicos Ltda (grupo Prime)", cnpj: "11.405.384/0001-49", modelo: "Dominus L1 (ultrassom)", modalidade: "us", cfi: "04313989", ncm: "9018.12.10", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "arcanjox", fabricante: "Alfa Med Sistemas Médicos Ltda (grupo Prime)", cnpj: "11.405.384/0001-49", modelo: "Arcanjo X (monitor multiparamétrico)", modalidade: "", cfi: "04251352", ncm: "9018.19.80", preco: null, origem: "nacional", fonte: CAT_FONTE },
  { id: "virto", fabricante: "Alfa Med Sistemas Médicos Ltda (grupo Prime)", cnpj: "11.405.384/0001-49", modelo: "Virto (oxímetro)", modalidade: "", cfi: "04311550", ncm: "9018.19.80", preco: null, origem: "nacional", fonte: CAT_FONTE }
];
/* Referência: TCs credenciadas de outros fabricantes (concorrência financiável no FINAME), mesma consulta. */
var CFI_TC_CONCORRENTES = [
  ["GE Healthcare do Brasil", "CT Ascend", "04322290"], ["GE Healthcare do Brasil", "CT Aspire", "04319586"], ["GE Healthcare do Brasil", "Revolution ACT", "03520230"],
  ["Siemens Healthineers", "SOMATOM go.Up / go.All / go.Top", "03671392 / 03792636 / 03793001"], ["Philips", "Incisive CT / CT 5300 / Access CT 16", "03797590 / 04291980 / 03511740"],
  ["Canon Medical", "Aquilion Start / Lightning / Prime SP / Serve / ONE Prism", "03711641 / 03693620 / 03766285 / 04227846 / 04148473"], ["Imex Medical", "Imagine One / One Up / One New Edition / Star", "04372521 / 04398270 / 04398263 / 04366590"]
];
