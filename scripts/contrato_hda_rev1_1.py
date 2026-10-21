# Contrato S&S × HDA — Revisão 1.1 (gera versão com alterações em vermelho e versão limpa)
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether, Image)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

MARCADO = sys.argv[1] == 'marcado'
OUT = sys.argv[2]
LOGO = sys.argv[3]

pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Italic', '/usr/share/fonts/truetype/crosextra/Carlito-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-BoldItalic', '/usr/share/fonts/truetype/crosextra/Carlito-BoldItalic.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold', italic='Carlito-Italic', boldItalic='Carlito-BoldItalic')

NAVY = colors.Color(0.105882, 0.164706, 0.305882)
GOLD = colors.Color(0.788235, 0.635294, 0.231373)
LINE = colors.Color(0.796078, 0.823529, 0.870588)
GRAY = colors.Color(0.4, 0.4, 0.45)
BG1 = colors.Color(0.952941, 0.960784, 0.980392)
BG2 = colors.Color(0.929412, 0.941176, 0.972549)
BGY = colors.Color(0.984314, 0.964706, 0.901961)
RED = '#C00000'


def r(t):
    """trecho alterado: vermelho na versão marcada, cor normal na limpa"""
    return f'<font color="{RED}">{t}</font>' if MARCADO else t


def d(t):
    """trecho removido: riscado em vermelho na versão marcada, ausente na limpa"""
    return f'<font color="{RED}"><strike>{t}</strike></font>' if MARCADO else ''


def esc(t):
    return t.replace('S&S', 'S&amp;S')


body = ParagraphStyle('body', fontName='Carlito', fontSize=10.5, leading=15, alignment=TA_JUSTIFY, leftIndent=18, spaceAfter=7)
body0 = ParagraphStyle('body0', parent=body, leftIndent=0)
bul = ParagraphStyle('bul', parent=body, leftIndent=36, bulletIndent=24, spaceAfter=3)
h = ParagraphStyle('h', fontName='Carlito-Bold', fontSize=12, leading=15, textColor=NAVY, spaceBefore=12, spaceAfter=3)
title = ParagraphStyle('title', fontName='Carlito-Bold', fontSize=14.5, leading=18, textColor=NAVY, alignment=TA_CENTER)
sub = ParagraphStyle('sub', fontName='Carlito', fontSize=9.5, leading=12, textColor=GRAY, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12)
boxt = ParagraphStyle('boxt', fontName='Carlito-Bold', fontSize=10, leading=13, textColor=NAVY)
boxb = ParagraphStyle('boxb', fontName='Carlito', fontSize=10, leading=13.5, textColor=NAVY)
th = ParagraphStyle('th', fontName='Carlito-Bold', fontSize=9.5, leading=12, textColor=colors.white)
td = ParagraphStyle('td', fontName='Carlito', fontSize=9.5, leading=12.5)
tdb = ParagraphStyle('tdb', parent=td, fontName='Carlito-Bold')
sh = ParagraphStyle('sh', fontName='Carlito-Bold', fontSize=10, leading=13, spaceBefore=6, spaceAfter=6)

story = []


def P(t, st=body):
    story.append(Paragraph(esc(t), st))


def H(t):
    story.append(Paragraph(esc(t), h))
    story.append(HRFlowable(width='100%', thickness=0.8, color=GOLD, spaceBefore=1, spaceAfter=8))


def C(n, t):
    P(f'<b>{n}.</b> {t}')


def B(t):
    story.append(Paragraph(esc(t), bul, bulletText='•'))


def box(titulo, texto, bg, borda):
    inner = [Paragraph(esc(titulo), boxt)] + [Paragraph(esc(x), boxb) for x in texto]
    t = Table([[inner]], colWidths=[451 - 18])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('LINEBEFORE', (0, 0), (0, -1), 1.5, borda),
                           ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                           ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    w = Table([[t]], colWidths=[451], style=[('LEFTPADDING', (0, 0), (-1, -1), 18), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                             ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)])
    story.append(w)


def tabela(head, rows, widths, primeira_negrito=True, total=None, indent=0):
    data = [[Paragraph(esc(x), th) for x in head]]
    for row in rows:
        data.append([Paragraph(esc(x), tdb if (i == 0 and primeira_negrito) else td) for i, x in enumerate(row)])
    t = Table(data, colWidths=widths, repeatRows=1)
    st = [('BACKGROUND', (0, 0), (-1, 0), NAVY), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
          ('LINEBELOW', (0, 1), (-1, -1), 0.5, LINE), ('BOX', (0, 0), (-1, -1), 0.5, LINE),
          ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
          ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]
    if total is not None:
        st += [('BACKGROUND', (0, total), (-1, total), BGY)]
    t.setStyle(TableStyle(st))
    if indent:
        t = Table([[t]], colWidths=[sum(widths) + indent], style=[('LEFTPADDING', (0, 0), (-1, -1), indent), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)])
    story.append(t)


# ---------------- capa ----------------
story.append(Image(LOGO, width=120, height=78))
story.append(Spacer(1, 8))
story.append(Paragraph('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA DE CRÉDITO E<br/>PROJECT FINANCE', title))
story.append(Paragraph('Hospital Dom Alvarenga · Revisão ' + r('1.1') + ' · São Paulo, outubro de 2026', sub))
if MARCADO:
    story.append(Paragraph(f'<font color="{RED}">Versão para aprovação: alterações em relação à Revisão 1.0 em vermelho; trechos removidos riscados.</font>', ParagraphStyle('nota', parent=sub, spaceBefore=0, spaceAfter=10)))

P('Pelo presente instrumento particular, as partes abaixo qualificadas:', body0)
P('<b>CONTRATANTE:</b> ASSOCIAÇÃO BENEFICENTE NOSSA SENHORA DE NAZARÉ, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº 60.975.976/0001-01, com sede na Av. Nazaré, nº 1361, Ipiranga, São Paulo/SP, CEP 04263-200, mantenedora do Hospital Dom Alvarenga, neste ato representada na forma de seu estatuto social, doravante denominada simplesmente <b>CONTRATANTE</b>;', body0)
P('<b>CONTRATADA:</b> DSJ Representações Ltda., pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº 33.192.178/0001-30, com sede na Rua Arizona, 1366 — Cj 81, Cidade Monções, São Paulo/SP, CEP ' + r('04567-900') + ', atuante sob ' + r('as marcas comerciais S&S Partners e S&S Consult') + ', neste ato representada por seu sócio-diretor Daurio Speranzini Junior, doravante denominada simplesmente <b>CONTRATADA</b>;', body0)
P('CONTRATANTE e CONTRATADA, quando referidas em conjunto, denominadas “Partes” e, individualmente, “Parte”, têm entre si, justo e contratado, o presente Contrato de Prestação de Serviços (“Contrato”), que se regerá pelas cláusulas e condições a seguir.', body0)

# ---------------- 1 ----------------
H('CLÁUSULA PRIMEIRA — DO OBJETO')
C('1.1', 'O presente Contrato tem por objeto a prestação, pela CONTRATADA, de serviços de assessoria de crédito e project finance em favor da CONTRATANTE, compreendendo:')
B('mapeamento, análise de elegibilidade e comparação das melhores linhas de crédito, fomento e financiamento disponíveis (BNDES, FINEP, bancos de fomento e comerciais, arrendadoras e/ou outras instituições que se mostrem adequadas);')
B('definição da estrutura ótima de financiamento (instituições, linhas, prazos, carência, garantias e custo);')
B('preparação do dossiê, submissão dos protocolos às instituições escolhidas e acompanhamento até a contratação e os desembolsos.')
story.append(Spacer(1, 4))
C('1.2', 'Os serviços destinam-se ao financiamento da aquisição de máquinas e equipamentos hospitalares fornecidos pela VMI Tecnologias Ltda. (“VMI”), conforme identificado no Anexo I (“Projeto”)' + r(', em duas fases: Fase 1, pacote de diagnóstico por imagem; e Fase 2, ressonância magnética, opcional e condicionada à decisão da CONTRATANTE') + '. A VMI não é parte deste Contrato e não responde pelos serviços, pela aprovação ou pelas condições do financiamento.')
C('1.3', 'Os serviços serão prestados com observância das melhores práticas técnicas, de forma diligente e no interesse da CONTRATANTE, na modalidade de obrigação de meio, não constituindo garantia de resultado quanto à aprovação ou ao valor de eventual captação, que dependem de decisão soberana das instituições financiadoras.')
C('1.4', 'Este Contrato constitui o Termo de Adesão previsto no Contrato de Parceria celebrado entre a CONTRATADA e a VMI, prevalecendo, entre CONTRATANTE e CONTRATADA, as condições aqui pactuadas.')
C(r('1.5'), r('Não integram o Projeto e não geram taxa de êxito: (a) a locação de equipamentos contratada diretamente com a VMI ou com outro fornecedor, sem captação da CONTRATANTE junto a instituição financeira; (b) a aquisição de equipamentos de outros fornecedores; (c) operações de renegociação, alongamento ou refinanciamento do endividamento existente da CONTRATANTE, que, se contratadas com a CONTRATADA, serão objeto de instrumento próprio; e (d) sistemas de informação, inclusive RIS e PACS. O arrendamento mercantil (leasing) contratado junto a arrendadora para a aquisição dos equipamentos do Projeto é considerado captação para os fins deste Contrato.'))
C(r('1.6'), r('A CONTRATADA declara que representa comercialmente a Sectra no Brasil, fornecedora de sistemas de PACS. A eventual contratação de sistemas da Sectra pela CONTRATANTE é independente deste Contrato e não integra a base da taxa de êxito.'))

# ---------------- 2 ----------------
H('CLÁUSULA SEGUNDA — DO PRAZO E CRONOGRAMA')
C('2.1', 'O prazo de vigência deste Contrato é de ' + r('18 (dezoito) meses, contados da data de sua assinatura, ou até o último desembolso das operações do Projeto, o que ocorrer primeiro') + ', prorrogável mediante termo aditivo escrito.')
C('2.2', 'O cronograma detalhado consta do Anexo I. A fase de acompanhamento dos protocolos tem duração variável conforme os ritos de cada instituição e prossegue, mesmo após o prazo de vigência, até o último desembolso da operação, sem custo adicional além da taxa de êxito' + r(', inclusive para as operações da Fase 2 submetidas durante a vigência') + '.')
C('2.3', 'O cronograma poderá ser ajustado por acordo escrito entre as Partes, notadamente em função da disponibilidade de informações, de atrasos nas aprovações por parte da CONTRATANTE e dos calendários das instituições financiadoras, nesses casos não acarretando penalidade, multa moratória ou encargo financeiro à CONTRATADA.')
C(r('2.4'), r('A submissão dos protocolos da Fase 1 depende da publicação do código FINAME (CFI) dos equipamentos financiáveis e do atendimento das condições de crédito exigidas pelas instituições, inclusive garantias. A Fase 2 depende da decisão da CONTRATANTE sobre a ressonância magnética, prevista para meados de 2027. Os prazos do Anexo I contam a partir do atendimento dessas condições.'))

# ---------------- 3 ----------------
H('CLÁUSULA TERCEIRA — DA REMUNERAÇÃO E CONDIÇÕES DE PAGAMENTO')
C('3.1', 'Pela prestação dos serviços, a CONTRATANTE pagará à CONTRATADA remuneração composta por (i) retainer de R$ 30.000,00, em 2 (duas) parcelas, e (ii) taxa de êxito de 2,15% sobre o valor captado' + r(' para o Projeto') + ', nos termos a seguir.')
box('Retainer — R$ 30.000,00 em duas parcelas', ['Valor fixo pelos serviços de levantamento, análise, estruturação, dossiê e submissão dos protocolos, dedutível da taxa de êxito conforme a cláusula 3.4.'], BG2, NAVY)
tabela(['Parcela', 'Vencimento', 'Valor'],
       [['1ª parcela', 'Até 5 (cinco) dias úteis após a assinatura', 'R$ 15.000,00'],
        ['2ª parcela', '30 (trinta) dias após o vencimento da 1ª parcela', 'R$ 15.000,00'],
        ['Total do retainer', '', 'R$ 30.000,00']], [110, 228, 95], total=3, indent=18)
story.append(Spacer(1, 10))
box('Taxa de êxito — 2,15% sobre o valor captado',
    ['Taxa de êxito de 2,15% (dois vírgula quinze por cento) sobre o valor bruto efetivamente captado pela CONTRATANTE' + r(' para o Projeto') + ' junto às instituições financeiras e de fomento (bancos, BNDES, FINEP, arrendadoras e/ou outras instituições consideradas no Projeto), ' + r('assim entendido o valor financiado dos equipamentos e itens do Anexo I, incluídos o capital de giro associado e os custos financiados na mesma operação, deduzido o crédito equivalente às parcelas do retainer efetivamente pagas, abatido dos primeiros desembolsos até se esgotar. A taxa é') + ' devida e paga conforme os desembolsos, incidindo sobre cada tranche à medida que é liberada' + d(', na proporção do respectivo desembolso') + '.',
     'Exemplo (retainer integralmente pago): captação de R$ 10 M → taxa de êxito = R$ 215 mil → crédito do retainer = R$ 30 mil → valor líquido devido = R$ 185 mil' + r(', com o crédito abatido do primeiro desembolso') + '. Se apenas a 1ª parcela tiver sido paga, o crédito é de R$ 15 mil e o valor líquido, R$ 200 mil.'], BGY, GOLD)
C('3.2', 'Cada parcela do retainer será faturada pela CONTRATADA e paga mediante transferência bancária para conta de titularidade da CONTRATADA indicada na fatura. O retainer não é reembolsável, ainda que a captação não se concretize, constituindo remuneração dos serviços prestados, e é dedutível da taxa de êxito nos termos da cláusula 3.4.')
C('3.3', 'A taxa de êxito tornar-se-á devida a cada desembolso realizado pela instituição financiadora em favor da CONTRATANTE, devendo ser paga no prazo de 5 (cinco) dias úteis contados do respectivo crédito, à razão de 2,15% do valor de cada tranche liberada, até o encerramento integral dos desembolsos da operação.')
C('3.4', 'Da taxa de êxito será descontado' + d(', proporcionalmente ao valor de cada tranche,') + ' o crédito equivalente ao valor total das parcelas do retainer efetivamente pagas, ' + r('abatido dos primeiros desembolsos até se esgotar,') + ' até o limite da própria taxa de êxito. Não há devolução do crédito que exceda a taxa de êxito apurada.')
C('3.5', r('Os valores deste Contrato incluem os tributos incidentes sobre a prestação dos serviços e estão sujeitos às retenções na fonte previstas na legislação.') + ' Eventuais despesas de viagens ou reuniões presenciais fora de São Paulo serão reembolsadas mediante apresentação de comprovantes e aprovação prévia da CONTRATANTE.')
C('3.6', 'O atraso em qualquer pagamento sujeitará a CONTRATANTE a multa moratória de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA, sem prejuízo das demais medidas cabíveis.')

# ---------------- 4 ----------------
H('CLÁUSULA QUARTA — DAS OBRIGAÇÕES DAS PARTES')
P('São obrigações da CONTRATADA:', body0)
B('executar os serviços descritos no Anexo I com diligência, qualidade e dentro dos prazos acordados;')
B('designar equipe qualificada e conduzir as reuniões de alinhamento e as apresentações dos marcos críticos;')
B('apresentar à CONTRATANTE, de forma transparente, as alternativas de financiamento avaliadas e os critérios da recomendação, cabendo à CONTRATANTE a decisão final sobre instituições, linhas e condições;')
B('manter disponibilidade para dúvidas e suporte via e-mail e WhatsApp;')
B('guardar sigilo sobre as informações da CONTRATANTE, nos termos da Cláusula Sétima.')
P('São obrigações da CONTRATANTE:', body0)
B('fornecer, tempestivamente, todas as informações, documentos e dados necessários à execução dos serviços, respondendo por sua veracidade e integridade;')
B('designar interlocutor responsável por aprovações e alinhamentos, e participar das reuniões previstas no cronograma;')
B('efetuar os pagamentos nas datas e condições acordadas;')
B('comunicar à CONTRATADA, de forma tempestiva, todo e qualquer desembolso recebido das instituições financiadoras, para fins de apuração da taxa de êxito;')
B('dar à CONTRATADA acesso aos termos finais das operações contratadas, para conferência da taxa de êxito.')

# ---------------- 5 ----------------
H('CLÁUSULA QUINTA — DOS ENTREGÁVEIS E DA PROPRIEDADE INTELECTUAL')
C('5.1', 'Todos os entregáveis produzidos no âmbito deste Contrato — mapas de linhas, estruturas, dossiês, modelos e apresentações — serão de propriedade da CONTRATANTE após a quitação integral das parcelas do retainer.')
C('5.2', 'As metodologias, frameworks e ferramentas proprietárias da CONTRATADA utilizadas na execução dos serviços permanecem de sua titularidade exclusiva, sendo licenciado à CONTRATANTE tão somente o uso incorporado aos entregáveis.')
C('5.3', 'A CONTRATADA poderá referir-se à experiência de forma genérica em seu portfólio, sem identificar a CONTRATANTE ou divulgar informações confidenciais, salvo autorização expressa.')

# ---------------- 6 ----------------
H('CLÁUSULA SEXTA — DA NÃO-CIRCUNVENÇÃO E NÃO-ALICIAMENTO')
C('6.1', 'A CONTRATANTE compromete-se a não contornar (bypass), direta ou indiretamente, a atuação da CONTRATADA, abstendo-se de negociar ou formalizar captações ' + r('para o Projeto junto às instituições às quais a CONTRATADA tenha submetido protocolo ou apresentado a operação, conforme registrado nos relatórios de status,') + ' sem a devida remuneração prevista na Cláusula Terceira.')
C('6.2', 'A obrigação de não-circunvenção vigora durante a vigência do Contrato e por 24 (vinte e quatro) meses após seu término ou rescisão (período de tail). Captações ' + r('para o Projeto') + ' formalizadas nesse período ' + r('junto às instituições referidas na cláusula 6.1') + ' ensejam a taxa de êxito prevista na cláusula 3.1. ' + r('Esta cláusula não se aplica a operações não relacionadas ao Projeto, inclusive com instituições com as quais a CONTRATANTE já mantenha relacionamento.'))
C('6.3', 'A violação desta cláusula sujeita a CONTRATANTE ao pagamento de multa ' + r('compensatória equivalente a 1 (uma) vez') + ' o valor da taxa de êxito que seria devida sobre a captação contornada' + d(', sem prejuízo da apuração de perdas e danos') + '.')
C('6.4', r('Para verificação do cumprimento desta cláusula, a CONTRATANTE fornecerá à CONTRATADA, mediante solicitação escrita durante o período previsto na cláusula 6.2, declaração sobre as captações realizadas para o Projeto e os termos finais das operações correspondentes.'))

# ---------------- 7 ----------------
H('CLÁUSULA SÉTIMA — DA CONFIDENCIALIDADE')
C('7.1', 'As Partes obrigam-se a manter em sigilo todas as informações confidenciais a que tiverem acesso em razão deste Contrato, utilizando-as exclusivamente para os fins aqui previstos.')
C('7.2', 'A obrigação de confidencialidade persiste por 48 (quarenta e oito) meses após o término ou rescisão deste Contrato, por qualquer motivo.')
C('7.3', 'Não se consideram confidenciais as informações de domínio público sem culpa da Parte receptora, ou cuja divulgação seja exigida por lei ou autoridade competente, caso em que a Parte notificará previamente a outra, quando permitido. A CONTRATANTE autoriza a CONTRATADA a compartilhar com a VMI informações sobre o andamento das operações, limitadas ' + r('à fase do processo, à aprovação e às datas e valores dos desembolsos, vedado o compartilhamento de demonstrações financeiras e demais informações econômico-financeiras da CONTRATANTE') + '.')

# ---------------- 8 ----------------
H('CLÁUSULA OITAVA — DA PROTEÇÃO DE DADOS E DA ANTICORRUPÇÃO')
C('8.1', 'As Partes tratarão dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD), utilizando-os apenas para as finalidades deste Contrato, e comunicarão uma à outra, em prazo razoável, qualquer incidente de segurança que os afete.')
C('8.2', 'As Partes declaram conhecer e cumprir a Lei nº 12.846/2013 e demais normas anticorrupção aplicáveis, comprometendo-se a não oferecer, prometer ou pagar vantagem indevida a agente público, a empregado de instituição financeira ou a terceiro, em conexão com este Contrato. A violação autoriza a rescisão imediata pela Parte inocente.')

# ---------------- 9 ----------------
H('CLÁUSULA NONA — DA RESCISÃO')
C('9.1', 'Este Contrato poderá ser rescindido por qualquer das Partes, imotivadamente, mediante comunicação escrita com antecedência mínima de 30 (trinta) dias, permanecendo devidas as parcelas do retainer vencidas até a data de encerramento.')
C('9.2', 'A rescisão, por qualquer motivo, não afasta o direito da CONTRATADA à taxa de êxito sobre captações já submetidas, aprovadas ou formalizadas, bem como sobre aquelas abrangidas pela Cláusula Sexta (não-circunvenção), observada a dedução prevista na cláusula 3.4.')
C('9.3', 'O inadimplemento de qualquer obrigação, não sanado no prazo de 15 (quinze) dias corridos após notificação escrita, autoriza a Parte inocente a rescindir o Contrato de pleno direito, sem prejuízo da cobrança dos valores vencidos e das perdas e danos.')

# ---------------- 10 ----------------
H('CLÁUSULA DÉCIMA — DA INDEPENDÊNCIA DAS PARTES' + r(' E DA RESPONSABILIDADE'))
C('10.1', 'A CONTRATADA atua como prestadora de serviços autônoma e independente, não se estabelecendo qualquer vínculo empregatício, societário ou associativo entre as Partes, nem entre a CONTRATANTE e os profissionais designados pela CONTRATADA, pelos quais esta é exclusivamente responsável. A CONTRATADA não é instituição financeira e não concede crédito.')
C(r('10.2'), r('A responsabilidade total da CONTRATADA por perdas e danos decorrentes deste Contrato fica limitada ao valor dos honorários efetivamente recebidos, salvo dolo ou culpa grave.'))

# ---------------- 11 ----------------
H('CLÁUSULA DÉCIMA PRIMEIRA — DAS DISPOSIÇÕES GERAIS')
C('11.1', 'Alterações a este Contrato somente serão válidas se formalizadas por escrito e assinadas por ambas as Partes.')
C('11.2', 'A tolerância quanto a eventual descumprimento não implica novação ou renúncia de direitos.')
C('11.3', 'A nulidade ou inexequibilidade de qualquer disposição não prejudica a validade das demais.')
C('11.4', 'Nenhuma das Partes poderá ceder ou transferir este Contrato sem o prévio e expresso consentimento escrito da outra.')
C('11.5', 'Este Contrato vincula as Partes e seus sucessores e cessionários autorizados, ' + d('sendo celebrado em caráter irrevogável e irretratável, ') + 'e seus Anexos o integram para todos os fins.')
C('11.6', 'As Partes elegem o Foro da Comarca de São Paulo, Capital, para dirimir controvérsias decorrentes deste Contrato, com renúncia a qualquer outro, por mais privilegiado que seja.')
C(r('11.7'), r('As Partes admitem a assinatura deste Contrato por meio eletrônico, nos termos do art. 784, § 4º, do Código de Processo Civil, caso em que fica dispensada a assinatura de testemunhas.'))

# ---------------- assinaturas ----------------
story.append(PageBreak())
P('E, por estarem assim justas e contratadas, as Partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas.', body0)
story.append(Spacer(1, 6))
P('São Paulo, _____ de ________________ de 2026.', body0)
story.append(Spacer(1, 36))
sg = ParagraphStyle('sg', fontName='Carlito', fontSize=10, leading=13)
sig = Table([[Paragraph('______________________________________', sg), Paragraph('______________________________________', sg)],
             [Paragraph('<b>ASSOCIAÇÃO BENEFICENTE NOSSA SENHORA DE NAZARÉ</b><br/>Nome/Cargo:<br/>CONTRATANTE', sg),
              Paragraph(esc('<b>DSJ Representações Ltda. — S&S Partners</b><br/>Daurio Speranzini Junior — Sócio-Diretor<br/>CONTRATADA'), sg)]],
            colWidths=[225, 225], style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0)])
story.append(sig)
story.append(Spacer(1, 30))
P('Testemunhas:', body0)
story.append(Spacer(1, 30))
wit = Table([[Paragraph('______________________________________', sg), Paragraph('______________________________________', sg)],
             [Paragraph('1)<br/>Nome:<br/>CPF:', sg), Paragraph('2)<br/>Nome:<br/>CPF:', sg)]],
            colWidths=[225, 225], style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0)])
story.append(wit)

# ---------------- Anexo I ----------------
story.append(PageBreak())
H('ANEXO I — ESCOPO, PROJETO E CRONOGRAMA')
P('Este Anexo exibe o escopo, o Projeto financiado e o cronograma detalhado, de conhecimento de ambas as Partes.', body0)
story.append(Paragraph('Dados do Projeto', sh))
tabela(['Item', 'Descrição'],
       [['Fornecedora', 'VMI Tecnologias Ltda. — CNPJ 02.659.246/0001-03'],
        ['Equipamentos', r('<b>Fase 1:</b> tomógrafo computadorizado Pulsar 128/64; 2 (dois) ultrassons Invictus; raio X móvel Aquila 320 S; raio X digital Apolo D; detector digital (placa DR).<br/><b>Fase 2 (opcional):</b> ressonância magnética Cignus 600 sem hélio, 24 canais.')],
        ['Proposta comercial VMI', r('Fase 1: preços de 15/10/2026; Fase 2: preço de 19/10/2026.') + '<br/>' + r('Proposta formal') + ' nº ______________ de ____ / ____ / ________'],
        ['Valor estimado da aquisição', r('Fase 1: R$ 2.720.000,00; Fase 2: R$ 5.200.000,00; total: R$ 7.920.000,00')],
        [r('Previsão de desembolso'), r('Fase 1: julho de 2027, com a instalação; Fase 2: janeiro de 2028, na entrega')]],
       [135, 316])
story.append(Spacer(1, 6))
story.append(Paragraph('Assessoria de crédito e project finance — do levantamento ao acompanhamento', sh))
tabela(['Semanas', 'Escopo', 'Responsável', 'Entregável'],
       [['1-2', 'Levantamento de informações e documentos; análise de elegibilidade e capacidade de crédito', 'CONTRATANTE e CONTRATADA', 'Checklist completo e análise de elegibilidade'],
        ['3-4', 'Mapeamento e comparação das linhas (bancos, fomento, arrendadoras); estrutura ótima', 'CONTRATADA', 'Mapa de Linhas e Recomendação'],
        ['5-8', 'Dossiê, decisão da CONTRATANTE e submissão dos protocolos' + r(' da Fase 1, após as condições da cláusula 2.4'), 'CONTRATADA e CONTRATANTE', 'Dossiê e Protocolos Submetidos'],
        ['9+', 'Acompanhamento dos protocolos até a contratação e o último desembolso', 'CONTRATADA', 'Relatório de status periódico'],
        [r('Fase 2'), r('Estrutura, dossiê e protocolo do financiamento da ressonância, após a decisão da CONTRATANTE (prevista para meados de 2027); acompanhamento até o desembolso'), r('CONTRATADA e CONTRATANTE'), r('Dossiê, protocolo e relatório de status')]],
       [62, 170, 104, 115])
story.append(Spacer(1, 10))
P('O cronograma proposto poderá ser revisado e sofrer alterações em benefício do melhor funcionamento de cada etapa, de comum acordo entre as partes.', body0)

# ---------------- Anexo II ----------------
story.append(PageBreak())
H('ANEXO II — CONDIÇÕES COMERCIAIS')
tabela(['Componente', 'Condição'],
       [['Retainer', 'R$ 30.000,00 em 2 parcelas de R$ 15.000,00; 1ª até 5 dias úteis após a assinatura e 2ª 30 dias após o vencimento da 1ª; não reembolsável; dedutível da taxa de êxito'],
        ['Taxa de êxito', '2,15% sobre o valor bruto captado' + r(' para o Projeto (equipamentos e itens do Anexo I, incluídos capital de giro associado e custos financiados na mesma operação)') + ', paga por tranche conforme os desembolsos da instituição financiadora'],
        ['Dedução do retainer', 'Crédito equivalente às parcelas do retainer efetivamente pagas, ' + r('abatido dos primeiros desembolsos até se esgotar') + ', até o limite da taxa de êxito'],
        ['Vencimento — êxito', '5 dias úteis após cada crédito/desembolso à CONTRATANTE'],
        ['Mora', 'Multa de 2%, juros de 1% ao mês e correção pelo IPCA'],
        ['Não-circunvenção', r('Restrita ao Projeto e às instituições que receberam protocolo da CONTRATADA;') + ' tail de 24 meses; multa ' + r('compensatória de 1×') + ' a taxa de êxito contornada; ' + r('verificação por declaração e termos finais das operações')],
        ['Confidencialidade', '48 meses após o término do Contrato'],
        ['Tributos e despesas', r('Valores com tributos inclusos, sujeitos às retenções na fonte') + '; despesas fora de SP reembolsadas mediante comprovação'],
        [r('Vigência'), r('18 meses ou até o último desembolso do Projeto, o que ocorrer primeiro')],
        [r('Fora da taxa de êxito'), r('Locação direta, equipamentos de outros fornecedores, reestruturação da dívida existente e sistemas (RIS e PACS)')],
        [r('Responsabilidade'), r('Limitada aos honorários recebidos, salvo dolo ou culpa grave')]],
       [135, 316])


# ---------------- página ----------------
def page(canv, doc):
    W, Hh = A4
    canv.saveState()
    if True:
        canv.drawImage(LOGO, 72, Hh - 21 - 23, width=36, height=23, mask='auto')
    canv.setFont('Carlito', 8)
    canv.setFillColor(GRAY)
    if True:
        canv.drawString(118, Hh - 37, '|  Contrato de Prestação de Serviços — Assoc. Benef. Nossa Senhora de Nazaré · Confidencial')
        canv.setStrokeColor(GOLD); canv.setLineWidth(0.8); canv.line(72, Hh - 50, W - 72, Hh - 50)
    canv.setStrokeColor(LINE); canv.setLineWidth(0.5); canv.line(72, 46, W - 72, 46)
    canv.setFont('Carlito', 7.5)
    ft = 'S&S Partners × Hospital Dom Alvarenga  |  DSJ Representações Ltda. · CNPJ 33.192.178/0001-30 · Rua Arizona 1366 Cj 81, São Paulo/SP  |  Pág.'
    canv.drawString(72, 32, ft)
    x = 72 + pdfmetrics.stringWidth(ft, 'Carlito', 7.5) + 4
    canv.setFont('Carlito-Bold', 10); canv.setFillColor(NAVY); canv.drawString(x, 31.5, str(doc.page))
    canv.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=72, rightMargin=72, topMargin=66, bottomMargin=64,
                      title='Contrato de Prestação de Serviços — S&S Partners × Hospital Dom Alvarenga — Revisão 1.1' + (' (alterações em vermelho)' if MARCADO else ''),
                      author='S&S Partners')
frame1 = Frame(72, 64, A4[0] - 144, A4[1] - 64 - 62, id='f1')
frameN = Frame(72, 64, A4[0] - 144, A4[1] - 64 - 66, id='fN')
doc.addPageTemplates([PageTemplate(id='first', frames=[frame1], onPage=page), PageTemplate(id='rest', frames=[frameN], onPage=page)])
from reportlab.platypus import NextPageTemplate
story.insert(0, NextPageTemplate('rest'))
doc.build(story)
print('ok', OUT)
