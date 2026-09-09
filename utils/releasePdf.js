


// const PDFDocument = require("pdfkit");
// const { buildReleaseDocument } = require("./releaseLetter");

// function writeParagraph(doc, text, options = {}) {
//   doc.font("Helvetica").fontSize(9.5).fillColor("#111111");

//   doc.text(text, {
//     align: "justify",
//     lineGap: 2.5,
//     ...options,
//   });

//   doc.moveDown(0.75);
// }

// function ensureSpace(doc, requiredHeight) {
//   const bottomLimit = doc.page.height - doc.page.margins.bottom;

//   if (doc.y + requiredHeight > bottomLimit) {
//     doc.addPage();
//   }
// }

// function drawConsentSignatureSection({
//   doc,
//   release,
//   signatureBuffer,
// }) {
//   ensureSpace(doc, 100);

//   const startY = doc.y + 4;
//   const leftX = doc.page.margins.left;
//   const pageRight = doc.page.width - doc.page.margins.right;
//   const contentWidth = pageRight - leftX;

//   const leftWidth = contentWidth * 0.52;
//   const rightX = leftX + leftWidth + 30;
//   const rightWidth = pageRight - rightX;

//   doc
//     .font("Helvetica-Bold")
//     .fontSize(10)
//     .fillColor("#111111")
//     .text("Regards,", leftX, startY, {
//       width: leftWidth,
//       align: "left",
//     });

//   doc
//     .font("Helvetica")
//     .fontSize(10)
//     .fillColor("#111111")
//     .text(`Name: ${release.regards.name}`, leftX, startY + 20, {
//       width: leftWidth,
//       align: "left",
//     });

//   doc
//     .font("Helvetica")
//     .fontSize(10)
//     .fillColor("#111111")
//     .text(`Place: ${release.regards.place}`, leftX, startY + 36, {
//       width: leftWidth,
//       align: "left",
//     });

//   doc
//     .font("Helvetica-Bold")
//     .fontSize(10)
//     .fillColor("#111111")
//     .text("Signature:", rightX, startY, {
//       width: rightWidth,
//       align: "left",
//     });

//   if (signatureBuffer?.length) {
//     try {
//       doc.image(signatureBuffer, rightX, startY + 18, {
//         fit: [170, 60],
//       });
//     } catch (error) {
//       doc
//         .font("Helvetica")
//         .fontSize(9)
//         .fillColor("#aa0000")
//         .text("[Signature image unavailable]", rightX, startY + 22, {
//           width: rightWidth,
//           align: "left",
//         });
//     }
//   } else {
//     doc
//       .font("Helvetica")
//       .fontSize(9)
//       .fillColor("#666666")
//       .text("Signature not available", rightX, startY + 22, {
//         width: rightWidth,
//         align: "left",
//       });
//   }

//   doc.y = startY + 85;
// }

// function generateReleasePdf({
//   name,
//   phone,
//   participantId,
//   location,
//   state = "Tamil Nadu",
//   acceptedAt = new Date(),
//   signatureBuffer,
// }) {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({
//       size: "A4",
//       margins: {
//         top: 46,
//         right: 48,
//         bottom: 46,
//         left: 48,
//       },
//       info: {
//         Title: `Bigg Boss Season 10 Release Letter - ${
//           name || "Participant"
//         }`,
//         Author: "Bigg Boss Tamil",
//       },
//     });

//     const chunks = [];

//     doc.on("data", (chunk) => {
//       chunks.push(chunk);
//     });

//     doc.on("error", reject);

//     doc.on("end", () => {
//       resolve(Buffer.concat(chunks));
//     });

//     const release = buildReleaseDocument({
//       name,
//       location,
//       state,
//       acceptedAt,
//     });

//     doc
//       .font("Helvetica-Bold")
//       .fontSize(14)
//       .fillColor("#111111")
//       .text("BIGG BOSS - SEASON 10", {
//         align: "center",
//       });

//     doc
//       .font("Helvetica")
//       .fontSize(9)
//       .fillColor("#666666")
//       .text("Participant Release & Consent", {
//         align: "center",
//       });

//     doc.moveDown(1);

//     doc
//       .font("Helvetica")
//       .fontSize(9)
//       .fillColor("#222222");

//     doc.text(`Participant: ${name || "-"}`);
//     doc.text(`Mobile: ${phone || "-"}`);
//     doc.text(`Participant ID: ${participantId || "-"}`);
//     doc.text(`Location: ${location || "-"}`);
//     doc.text(`State: ${state || "Tamil Nadu"}`);
//     doc.text(`Date: ${release.dateLine}`);

//     doc.moveDown(1);

//     doc
//       .font("Helvetica")
//       .fontSize(10)
//       .fillColor("#111111")
//       .text(release.dateLine);

//     doc.moveDown(0.4);

//     doc
//       .font("Helvetica-Bold")
//       .fontSize(13)
//       .fillColor("#111111")
//       .text(release.title, {
//         align: "center",
//       });

//     doc.moveDown(1);

//     writeParagraph(doc, release.intro);

//     for (const clause of release.clauses) {
//       writeParagraph(doc, clause);
//     }

//     for (const paragraph of release.endingParagraphs) {
//       writeParagraph(doc, paragraph);
//     }

//     drawConsentSignatureSection({
//       doc,
//       release,
//       signatureBuffer,
//     });

//     doc.end();
//   });
// }

// module.exports = {
//   generateReleasePdf,
// };



const path = require("path");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");
const {
  buildReleaseDocument,
  LEGAL_POLICY_URL,
} = require("./releaseLetter");

const TAMIL_FONT = "TamilRegular";
const TAMIL_BOLD_FONT = "TamilBold";
const PDF_TEXT_COLOR = "#111111";
const TAMIL_REGULAR_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "fonts",
  "NotoSansTamil-Regular.ttf",
);
const TAMIL_BOLD_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "fonts",
  "NotoSansTamil-Bold.ttf",
);
const TAMIL_SCRIPT_REGEX = /[஀-௿]+/g;

function registerTamilFonts(doc) {
  doc.registerFont(TAMIL_FONT, TAMIL_REGULAR_PATH);
  doc.registerFont(TAMIL_BOLD_FONT, TAMIL_BOLD_PATH);
}

/**
 * Splits text into alternating Tamil-script / non-Tamil-script runs so each
 * run can be rendered with a font that actually has glyphs for it. PDFKit's
 * standard Helvetica fonts only cover WinAnsi (Latin-1) and mangle Tamil.
 */
function splitByScript(text) {
  const segments = [];
  let lastIndex = 0;
  let match;
  TAMIL_SCRIPT_REGEX.lastIndex = 0;
  while ((match = TAMIL_SCRIPT_REGEX.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), tamil: false });
    }
    segments.push({ text: match[0], tamil: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), tamil: false });
  }
  return segments.filter((segment) => segment.text.length > 0);
}

/**
 * Renders a single-run string (label/value lines, regards block, etc.)
 * switching fonts mid-string so Tamil segments use the embedded Tamil font
 * while English segments keep the existing Helvetica styling.
 */
// function writeMixedRun(doc, text, options = {}) {
//   const { x, y, width, align = "left", bold = false, size = 9.5, color = "#111111" } = options;
//   const segments = splitByScript(String(text ?? ""));
//   if (segments.length === 0) return;
//   const latinFont = bold ? "Helvetica-Bold" : "Helvetica";
//   const tamilFont = bold ? TAMIL_BOLD_FONT : TAMIL_FONT;
//   segments.forEach((segment, index) => {
//     const isFirst = index === 0;
//     const isLast = index === segments.length - 1;
//     // Re-assert the body text color for every run (including Tamil) so it
//     // never inherits a heading/label color from an earlier doc.fillColor call.
//     doc.fillColor(color);
//     doc.font(segment.tamil ? tamilFont : latinFont).fontSize(size);
//     const textOptions = {
//       underline: false,
//       link: null,
//       continued: !isLast,
//     };
//     if (width !== undefined) textOptions.width = width;
//     if (isLast) textOptions.align = align;
//     if (isFirst && x !== undefined && y !== undefined) {
//       doc.text(segment.text, x, y, textOptions);
//     } else {
//       doc.text(segment.text, textOptions);
//     }
//   });
// }

function writeMixedRun(doc,text,options={}) {
  const {
    x,
    y,
    width,
    align="left",
    bold=false,
    size=9.5
  }=options;

  const segments=splitByScript(String(text??""));

  if(!segments.length)return;

  const latinFont=bold?"Helvetica-Bold":"Helvetica";
  const tamilFont=bold?TAMIL_BOLD_FONT:TAMIL_FONT;

  segments.forEach((segment,index)=>{

    const isFirst=index===0;
    const isLast=index===segments.length-1;

    doc
      .fillOpacity(1)
      .fillColor(PDF_TEXT_COLOR)
      .font(segment.tamil?tamilFont:latinFont)
      .fontSize(size);

    const textOptions={
      underline:false,
      link:null,
      continued:!isLast
    };

    if(width!==undefined){
      textOptions.width=width;
    }

    if(isLast){
      textOptions.align=align;
    }

    if(isFirst && x!==undefined && y!==undefined){

      doc.text(
        segment.text,
        x,
        y,
        textOptions
      );

    }else{

      doc.text(
        segment.text,
        textOptions
      );

    }
  });
}

/**
 * Renders a justified paragraph that may contain Tamil segments, mirroring
 * writeParagraphWithLink's continued-text technique.
 */
// function writeMixedParagraph(doc, text, { x, width, bold = false, size = 9.5, color = "#111111", lineGap = 2.5 } = {}) {
//   const segments = splitByScript(String(text ?? ""));
//   if (segments.length === 0) return;
//   const latinFont = bold ? "Helvetica-Bold" : "Helvetica";
//   const tamilFont = bold ? TAMIL_BOLD_FONT : TAMIL_FONT;
//   segments.forEach((segment, index) => {
//     const isFirst = index === 0;
//     const isLast = index === segments.length - 1;
//     // Re-assert the body text color for every run (including Tamil) so it
//     // never inherits a heading/label color from an earlier doc.fillColor call.
//     doc.fillColor(color);
//     doc.font(segment.tamil ? tamilFont : latinFont).fontSize(size);
//     const options = {
//       width,
//       lineGap,
//       underline: false,
//       link: null,
//       continued: !isLast,
//     };
//     if (isLast) options.align = "justify";
//     if (isFirst) {
//       doc.text(segment.text, x, doc.y, options);
//     } else {
//       doc.text(segment.text, options);
//     }
//   });
// }


function writeMixedParagraph(doc,text,options={}) {

  const {
    x,
    width,
    bold=false,
    size=9.5,
    lineGap=2.5
  }=options;

  const segments=splitByScript(String(text??""));

  if(!segments.length)return;

  const latinFont=bold?"Helvetica-Bold":"Helvetica";
  const tamilFont=bold?TAMIL_BOLD_FONT:TAMIL_FONT;

  segments.forEach((segment,index)=>{

    const isFirst=index===0;
    const isLast=index===segments.length-1;

    doc
      .fillOpacity(1)
      .fillColor(PDF_TEXT_COLOR)
      .font(segment.tamil?tamilFont:latinFont)
      .fontSize(size);


    const textOptions={
      width,
      lineGap,
      underline:false,
      link:null,
      continued:!isLast
    };


    if(isLast){
      textOptions.align="justify";
    }


    if(isFirst){

      doc.text(
        segment.text,
        x,
        doc.y,
        textOptions
      );

    }else{

      doc.text(
        segment.text,
        textOptions
      );

    }

  });
}
function getContentMetrics(doc) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  return {
    left,
    right,
    width: right - left,
  };
}
function formatIndianPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "-";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91 ${digits.slice(1)}`;
  }
  return raw;
}
function writeNormalParagraph(doc, text, options = {}) {
  const { skipMoveDown = false, ...textOptions } = options;
  const metrics = getContentMetrics(doc);
  doc.x = metrics.left;
  doc.font("Helvetica").fontSize(9.5).fillColor("#111111");
  doc.text(text, metrics.left, doc.y, {
    width: metrics.width,
    align: "justify",
    lineGap: 2.5,
    underline: false,
    link: null,
    ...textOptions,
  });
  doc.x = metrics.left;
  if (!skipMoveDown) {
    doc.moveDown(0.75);
  }
}
function writeParagraphWithLink(doc, text) {
  if (!text.includes(LEGAL_POLICY_URL)) {
    writeNormalParagraph(doc, text);
    return;
  }
  const metrics = getContentMetrics(doc);
  const linkIndex = text.indexOf(LEGAL_POLICY_URL);
  const beforeLink = text.slice(0, linkIndex);
  const afterLink = text.slice(linkIndex + LEGAL_POLICY_URL.length);
  doc.x = metrics.left;
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#111111")
    .text(beforeLink, metrics.left, doc.y, {
      width: metrics.width,
      lineGap: 2.5,
      continued: true,
      underline: false,
      link: null,
    });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#0563C1")
    .text(LEGAL_POLICY_URL, {
      continued: true,
      link: LEGAL_POLICY_URL,
      underline: true,
      lineGap: 2.5,
    });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#111111")
    .text(afterLink, {
      continued: false,
      width: metrics.width,
      align: "justify",
      lineGap: 2.5,
      underline: false,
      link: null,
    });
  doc.fillColor("#111111");
  doc.x = metrics.left;
  doc.moveDown(0.75);
}
function ensureSpace(doc, requiredHeight) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottomLimit) {
    doc.addPage();
    doc.x = doc.page.margins.left;
  }
}
async function prepareSignature(signatureBuffer) {
  if (!signatureBuffer?.length) {
    return null;
  }
  try {
    const { data, info } = await sharp(signatureBuffer)
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
        threshold: 10,
      })
      .extend({
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
      })
      .png()
      .toBuffer({
        resolveWithObject: true,
      });
    return {
      buffer: data,
      width: info.width,
      height: info.height,
    };
  } catch {
    return {
      buffer: signatureBuffer,
      width: null,
      height: null,
    };
  }
}
function getSignatureSize(signature, maxWidth, maxHeight) {
  if (!signature?.width || !signature?.height) {
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }
  const scale = Math.min(
    maxWidth / signature.width,
    maxHeight / signature.height,
  );
  return {
    width: signature.width * scale,
    height: signature.height * scale,
  };
}
function drawConsentSignatureSection({
  doc,
  release,
  signature,
}) {
  const GAP_BEFORE = 6;
  const LEFT_LINE_GAP = 5;
  const SIGNATURE_LABEL_GAP = 4;
  const SIGNATURE_BLOCK_WIDTH = 150;
  const SIGNATURE_MAX_WIDTH = 125;
  const SIGNATURE_MAX_HEIGHT = 44;
  const metrics = getContentMetrics(doc);
  const leftX = metrics.left;
  const pageRight = metrics.right;
  const leftWidth = 230;
  const signatureBlockX = pageRight - SIGNATURE_BLOCK_WIDTH;
  const nameText = `Name: ${release.regards.name}`;
  const placeText = `Place: ${release.regards.place}`;
  const hasTamil = (value) => {
    TAMIL_SCRIPT_REGEX.lastIndex = 0;
    return TAMIL_SCRIPT_REGEX.test(value);
  };
  doc.font("Helvetica-Bold").fontSize(10);
  const regardsHeight = doc.heightOfString("Regards,", {
    width: leftWidth,
  });
  doc.font(hasTamil(nameText) ? TAMIL_FONT : "Helvetica").fontSize(10);
  const nameHeight = doc.heightOfString(nameText, {
    width: leftWidth,
  });
  doc.font(hasTamil(placeText) ? TAMIL_FONT : "Helvetica").fontSize(10);
  const placeHeight = doc.heightOfString(placeText, {
    width: leftWidth,
  });
  const leftBlockHeight =
    regardsHeight +
    LEFT_LINE_GAP +
    nameHeight +
    LEFT_LINE_GAP +
    placeHeight;
  doc.font("Helvetica-Bold").fontSize(10);
  const signatureLabelHeight = doc.heightOfString("Signature:", {
    width: SIGNATURE_BLOCK_WIDTH,
  });
  const signatureSize = signature
    ? getSignatureSize(
        signature,
        SIGNATURE_MAX_WIDTH,
        SIGNATURE_MAX_HEIGHT,
      )
    : {
        width: SIGNATURE_MAX_WIDTH,
        height: SIGNATURE_MAX_HEIGHT,
      };
  const rightBlockHeight =
    signatureLabelHeight +
    SIGNATURE_LABEL_GAP +
    signatureSize.height;
  const blockHeight = Math.max(
    leftBlockHeight,
    rightBlockHeight,
  );
  ensureSpace(
    doc,
    GAP_BEFORE + blockHeight + 4,
  );
  const startY = doc.y + GAP_BEFORE;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111111")
    .text("Regards,", leftX, startY, {
      width: leftWidth,
      align: "left",
      underline: false,
      link: null,
    });
  writeMixedRun(doc, nameText, {
    x: leftX,
    y: startY + regardsHeight + LEFT_LINE_GAP,
    width: leftWidth,
    align: "left",
    size: 10,
    color: "#111111",
  });
  const placeY =
    startY + regardsHeight + LEFT_LINE_GAP + nameHeight + LEFT_LINE_GAP;
  writeMixedRun(doc, placeText, {
    x: leftX,
    y: placeY,
    width: leftWidth,
    align: "left",
    size: 10,
    color: "#111111",
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111111")
    .text(
      "Signature:",
      signatureBlockX,
      startY,
      {
        width: SIGNATURE_BLOCK_WIDTH,
        align: "right",
        underline: false,
        link: null,
      },
    );
  const signatureTop =
    startY +
    signatureLabelHeight +
    SIGNATURE_LABEL_GAP;
  if (signature?.buffer?.length) {
    try {
      const signatureX =
        pageRight -
        signatureSize.width;
      doc.image(
        signature.buffer,
        signatureX,
        signatureTop,
        {
          width: signatureSize.width,
          height: signatureSize.height,
        },
      );
    } catch {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#aa0000")
        .text(
          "[Signature image unavailable]",
          signatureBlockX,
          signatureTop,
          {
            width: SIGNATURE_BLOCK_WIDTH,
            align: "right",
            underline: false,
            link: null,
          },
        );
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(
        "Signature not available",
        signatureBlockX,
        signatureTop,
        {
          width: SIGNATURE_BLOCK_WIDTH,
          align: "right",
          underline: false,
          link: null,
        },
      );
  }
  doc.x = leftX;
  doc.y =
    startY +
    blockHeight +
    4;
}
async function generateReleasePdf({
  name,
  phone,
  participantId,
  location,
  state = "Tamil Nadu",
  acceptedAt = new Date(),
  signatureBuffer,
}) {
  const signature = await prepareSignature(signatureBuffer);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 46,
        right: 48,
        bottom: 46,
        left: 48,
      },
      info: {
        Title: `Bigg Boss Season 10 Release Letter - ${
          name || "Participant"
        }`,
        Author: "Bigg Boss Tamil",
      },
    });
    registerTamilFonts(doc);
    const chunks = [];
    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("error", reject);
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    const release = buildReleaseDocument({
      name,
      location,
      state,
      acceptedAt,
    });
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#111111")
      .text("BIGG BOSS - SEASON 10", {
        align: "center",
        underline: false,
        link: null,
      });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text("Participant Release & Consent", {
        align: "center",
        underline: false,
        link: null,
      });
    doc.moveDown(1);
    const formattedPhone = formatIndianPhone(phone);
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor("#111111");
    writeMixedRun(doc, `Participant: ${name || "-"}`, {
      bold: true,
      size: 9.5,
      color: "#111111",
    });
    doc.text(`Mobile: ${formattedPhone}`, {
      underline: false,
      link: null,
    });
    doc.text(`Participant ID: ${participantId || "-"}`, {
      underline: false,
      link: null,
    });
    writeMixedRun(doc, `Location: ${location || "-"}`, {
      bold: true,
      size: 9.5,
      color: "#111111",
    });
    writeMixedRun(doc, `State: ${state || "Tamil Nadu"}`, {
      bold: true,
      size: 9.5,
      color: "#111111",
    });
    doc.text(`Date: ${release.dateLine}`, {
      underline: false,
      link: null,
    });
    doc.moveDown(0.65);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#111111")
      .text(release.title, {
        align: "center",
        underline: false,
        link: null,
      });
    doc.moveDown(0.8);
    {
      const introMetrics = getContentMetrics(doc);
      doc.x = introMetrics.left;
      writeMixedParagraph(doc, release.intro, {
        x: introMetrics.left,
        width: introMetrics.width,
      });
      doc.x = introMetrics.left;
      doc.moveDown(0.75);
    }
    for (const clause of release.clauses) {
      writeParagraphWithLink(
        doc,
        clause,
      );
    }
    release.endingParagraphs.forEach(
      (paragraph, index) => {
        const isLast =
          index ===
          release.endingParagraphs.length - 1;
        writeNormalParagraph(
          doc,
          paragraph,
          {
            skipMoveDown: isLast,
          },
        );
      },
    );
    drawConsentSignatureSection({
      doc,
      release,
      signature,
    });
    doc.end();
  });
}
module.exports = {
  generateReleasePdf,
};