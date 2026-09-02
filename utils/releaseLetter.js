

// const { TIMEZONE } = require("../config/campaignConfig");

// const RELEASE_CLAUSES = [
//   `1. I do hereby consent and agree that there is no consideration involved, whether monetary or otherwise, for my participation in an activity for the promotion of the show “Bigg Boss – Season 10” in Tamil (“Program”), organized and conducted by and/or on behalf of JioStar India Private Limited (formerly known as Star India Private Limited) (“JioStar”) and/or its affiliates and/or representatives (“Activity”). I waive any right to royalties or other compensation arising from or related to the exploitation of Footage (defined below) by JioStar and/or its affiliates and/or any authorized third parties.`,
//   `2. I hereby unconditionally and irrevocably authorize, permit, and grant consent to JioStar, its affiliates and/ or their authorized representatives to interview me, ask questions, record, ask to perform, take photographs, film my appearance, make one or more audio recording, audio/video recording and/or digital recordings in respect of the Activity (“Footage”) and use, broadcast, exploit and communicate to public the Footage, in any and all mode, media or platform (including but not limited to social media platforms such as Instagram, X, Facebook, YouTube, etc.), now or hereafter known, for the purpose of, in connection with and for inclusion of the same in or outside of the Activity, Program or promotion of the Program and/or for any other purpose, including the right to copy, alter, modify and/or edit the Footage as may be required for the purpose of the Activity, Program and/or any other purpose at the sole discretion of JioStar and/or its affiliates.`,
//   `3. I acknowledge that the performance (if any) given by me in the Footage shall not be construed to be a live performance. I agree and acknowledge that all rights in the Footage, including all rights of exploitation in all modes and mediums whether now known or invented in future, shall vest with JioStar and its affiliates in perpetuity for the entire world.`,
//   `4. I acknowledge and agree that no information arising out of or related to my participation in the Footage shall constitute or be deemed as confidential information and I hereby expressly authorize the disclosure of all such information, including without limitation biographical and personal information, through broadcast, telecast, print, internet, or any other media, technology in existence or that may be later known or devised, as JioStar and/or its affiliates may deem fit. I expressly consent to the incorporation of the Footage in the Activity, Program, and/or promotion of the Program and/or for any other purpose, for exploitation in any manner as deemed fit by JioStar and/or its affiliates. I consent that my name and identity may be revealed during the course of exploitation of the Footage, by descriptive text or commentary or otherwise. I further consent and waive any and all rights, claims, or interest to my name, likeness and private life being included in the subject matter of the Footage and any related publicity, advertising, magazine material and/or any media whatsoever.`,
//   `5. I do hereby release in favour of and unconditionally grant, assign, sell, convey and transfer to JioStar and its affiliates, all rights including but not limited to the intellectual property rights, copyrights and all other allied, ancillary and subsidiary rights in any and all media, all formats, etc. in and to the Footage, for use/exploitation on any and all media, now or hereafter known, for world and in perpetuity. I understand that JioStar and its affiliates reserve the right not to exploit a part or whole of the Footage and I agree that such decision shall be taken solely at JioStar and/or its affiliates' discretion.`,
//   `6. I acknowledge and agree that JioStar and its affiliates will have access to and collect information and data shared by me including my personal information, I hereby consent to the collection, receipt, use, storage, processing and the transfer of and sharing of by JioStar, its affiliates, and third parties in accordance with the terms of policies which are accessible at https://www.jiostar.com/legal-terms-policies/ (“Policy”). It is deemed that I have read, understood, accepted and agree to irrevocably and unconditionally abide by and be bound by all Policy. The decision of JioStar for all matters relating to my participation in the Footage shall be final and binding in all respects.`,
//   `7. I further state that I waive all rights to file, in person/ through any family member and/or third party, any applications, criminal and/or civil proceedings in any courts or forum in India or any other jurisdiction, against JioStar and/or its affiliates, the channels, its employees, or any other person in respect of any physical, mental and emotional trauma or financial loss that I may undergo during or after the telecast/exploitation of the Footage or in relation to the Activity, Program or promotion of the Program and/or any other purpose, in any manner whatsoever. I hereby waive any and all rights of privacy, etc.`,
//   `8. I hereby agree to release, defend, hold harmless, fully indemnify and keep indemnified JioStar and/or its channels, including its affiliates, directors, employees, agents, etc. from and against all actions, proceedings, claims, demands, costs (including without prejudice to the generality of this provision legal costs and attorney fees) awards and damages however arising directly or indirectly as a result of any breach of my obligations / representations herein and/or for broadcasting, telecasting, distributing, exploiting the Footage in whole or in part, in any and all media, and/or any injury, accidents caused due to participation for the Activity.`,
// ];

// const RELEASE_ENDING_PARAGRAPHS = [
//   `I have read this release (“Release”) before signing below, and I fully understand and agree with the contents, meaning and impact of this Release. I am competent to execute this Release and have the full right and authority to enter into this Release and to grant the authority for exploitation of all rights as stated hereinbefore on my behalf. I hereby agree at all times, at no compensation payable to me, to execute and deliver all further documents and instruments, and do all acts and things, which JioStar may require to perfect the Release, to confirm the existence of the preceding, and to effectuate its purpose to convey such rights to JioStar and comply with applicable laws.`,
//   `I understand that I am free to address any specific questions regarding this Release by submitting those questions in writing prior to signing, and I agree that my failure to do so will be interpreted as a free and knowledgeable acceptance of the terms of this Release. This Release shall be governed by and construed in accordance with, the laws of India and shall be subject to the exclusive jurisdiction of Chennai Courts only.`,
// ];

// function formatReleaseDate(date = new Date()) {
//   const parts = new Intl.DateTimeFormat("en-GB", {
//     timeZone: TIMEZONE || "Asia/Kolkata",
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   }).formatToParts(date);

//   const get = (type) =>
//     parts.find((part) => part.type === type)?.value || "";

//   return `${get("day")} ${get("month")}, ${get("year")}`;
// }

// function buildReleaseDocument({
//   name,
//   location,
//   state = "Tamil Nadu",
//   acceptedAt = new Date(),
// }) {
//   const safeName = String(name || "Participant").trim();
//   const safeLocation = String(location || "").trim();
//   const safeState = String(state || "Tamil Nadu").trim();

//   return {
//     dateLine: formatReleaseDate(acceptedAt),
//     title: "RELEASE LETTER",
//     intro: `I, ${safeName}, an adult citizen and resident of India, residing at ${safeLocation}, ${safeState}, state that:`,
//     clauses: RELEASE_CLAUSES,
//     endingParagraphs: RELEASE_ENDING_PARAGRAPHS,
//     regards: {
//       name: safeName,
//       place: safeLocation,
//     },
//   };
// }

// module.exports = {
//   RELEASE_CLAUSES,
//   RELEASE_ENDING_PARAGRAPHS,
//   formatReleaseDate,
//   buildReleaseDocument,
// };

const { TIMEZONE } = require("../config/campaignConfig");
const LEGAL_POLICY_URL = "https://www.jiostar.com/legal-terms-policies";
const RELEASE_CLAUSES = [
  `1. I do hereby consent and agree that there is no consideration involved, whether monetary or otherwise, for my participation in an activity for the promotion of the show “Bigg Boss – Season 10” in Tamil (“Program”), organized and conducted by and/or on behalf of JioStar India Private Limited (formerly known as Star India Private Limited) (“JioStar”) and/or its affiliates and/or representatives (“Activity”). I waive any right to royalties or other compensation arising from or related to the exploitation of Footage (defined below) by JioStar and/or its affiliates and/or any authorized third parties.`,
  `2. I hereby unconditionally and irrevocably authorize, permit, and grant consent to JioStar, its affiliates and/ or their authorized representatives to interview me, ask questions, record, ask to perform, take photographs, film my appearance, make one or more audio recording, audio/video recording and/or digital recordings in respect of the Activity (“Footage”) and use, broadcast, exploit and communicate to public the Footage, in any and all mode, media or platform (including but not limited to social media platforms such as Instagram, X, Facebook, YouTube, etc.), now or hereafter known, for the purpose of, in connection with and for inclusion of the same in or outside of the Activity, Program or promotion of the Program and/or for any other purpose, including the right to copy, alter, modify and/or edit the Footage as may be required for the purpose of the Activity, Program and/or any other purpose at the sole discretion of JioStar and/or its affiliates.`,
  `3. I acknowledge that the performance (if any) given by me in the Footage shall not be construed to be a live performance. I agree and acknowledge that all rights in the Footage, including all rights of exploitation in all modes and mediums whether now known or invented in future, shall vest with JioStar and its affiliates in perpetuity for the entire world.`,
  `4. I acknowledge and agree that no information arising out of or related to my participation in the Footage shall constitute or be deemed as confidential information and I hereby expressly authorize the disclosure of all such information, including without limitation biographical and personal information, through broadcast, telecast, print, internet, or any other media, technology in existence or that may be later known or devised, as JioStar and/or its affiliates may deem fit. I expressly consent to the incorporation of the Footage in the Activity, Program, and/or promotion of the Program and/or for any other purpose, for exploitation in any manner as deemed fit by JioStar and/or its affiliates. I consent that my name and identity may be revealed during the course of exploitation of the Footage, by descriptive text or commentary or otherwise. I further consent and waive any and all rights, claims, or interest to my name, likeness and private life being included in the subject matter of the Footage and any related publicity, advertising, magazine material and/or any media whatsoever.`,
  `5. I do hereby release in favour of and unconditionally grant, assign, sell, convey and transfer to JioStar and its affiliates, all rights including but not limited to the intellectual property rights, copyrights and all other allied, ancillary and subsidiary rights in any and all media, all formats, etc. in and to the Footage, for use/exploitation on any and all media, now or hereafter known, for world and in perpetuity. I understand that JioStar and its affiliates reserve the right not to exploit a part or whole of the Footage and I agree that such decision shall be taken solely at JioStar and/or its affiliates' discretion.`,
  `6. I acknowledge and agree that JioStar and its affiliates will have access to and collect information and data shared by me including my personal information, I hereby consent to the collection, receipt, use, storage, processing and the transfer of and sharing of by JioStar, its affiliates, and third parties in accordance with the terms of policies which are accessible at ${LEGAL_POLICY_URL} (“Policy”). It is deemed that I have read, understood, accepted and agree to irrevocably and unconditionally abide by and be bound by all Policy. The decision of JioStar for all matters relating to my participation in the Footage shall be final and binding in all respects.`,
  `7. I further state that I waive all rights to file, in person/ through any family member and/or third party, any applications, criminal and/or civil proceedings in any courts or forum in India or any other jurisdiction, against JioStar and/or its affiliates, the channels, its employees, or any other person in respect of any physical, mental and emotional trauma or financial loss that I may undergo during or after the telecast/exploitation of the Footage or in relation to the Activity, Program or promotion of the Program and/or any other purpose, in any manner whatsoever. I hereby waive any and all rights of privacy, etc.`,
  `8. I hereby agree to release, defend, hold harmless, fully indemnify and keep indemnified JioStar and/or its channels, including its affiliates, directors, employees, agents, etc. from and against all actions, proceedings, claims, demands, costs (including without prejudice to the generality of this provision legal costs and attorney fees) awards and damages however arising directly or indirectly as a result of any breach of my obligations / representations herein and/or for broadcasting, telecasting, distributing, exploiting the Footage in whole or in part, in any and all media, and/or any injury, accidents caused due to participation for the Activity.`,
];
const RELEASE_ENDING_PARAGRAPHS = [
  `I have read this release (“Release”) before signing below, and I fully understand and agree with the contents, meaning and impact of this Release. I am competent to execute this Release and have the full right and authority to enter into this Release and to grant the authority for exploitation of all rights as stated hereinbefore on my behalf. I hereby agree at all times, at no compensation payable to me, to execute and deliver all further documents and instruments, and do all acts and things, which JioStar may require to perfect the Release, to confirm the existence of the preceding, and to effectuate its purpose to convey such rights to JioStar and comply with applicable laws.`,
  `I understand that I am free to address any specific questions regarding this Release by submitting those questions in writing prior to signing, and I agree that my failure to do so will be interpreted as a free and knowledgeable acceptance of the terms of this Release. This Release shall be governed by and construed in accordance with, the laws of India and shall be subject to the exclusive jurisdiction of Chennai Courts only.`,
];
function formatReleaseDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE || "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const get = (type) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("day")} ${get("month")}, ${get("year")}`;
}
function buildReleaseDocument({
  name,
  location,
  state = "Tamil Nadu",
  acceptedAt = new Date(),
}) {
  const safeName = String(
    name || "Participant",
  ).trim();
  const safeLocation = String(
    location || "",
  ).trim();
  const safeState = String(
    state || "Tamil Nadu",
  ).trim();
  return {
    dateLine: formatReleaseDate(acceptedAt),
    title: "RELEASE LETTER",
    intro: `I, ${safeName}, an adult citizen and resident of India, residing at ${safeLocation}, ${safeState}, state that:`,
    clauses: RELEASE_CLAUSES,
    endingParagraphs: RELEASE_ENDING_PARAGRAPHS,
    regards: {
      name: safeName,
      place: safeLocation,
    },
  };
}
module.exports = {
  LEGAL_POLICY_URL,
  RELEASE_CLAUSES,
  RELEASE_ENDING_PARAGRAPHS,
  formatReleaseDate,
  buildReleaseDocument,
};