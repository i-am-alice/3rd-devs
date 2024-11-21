export const extractTagContent = (content: string, tag: string): string | null => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  };
  
  export const formatSearchResults = (results: any[], searchType: string): string => {
    return `<${searchType.toLowerCase().replace(" ", "_")}>\n` + results.map(item => 
      `<resource id="${item.node.id}" name="${item.node.name}" url="${item.node.url}" desc="${item.node.description}">${item.node.content}</resource>`
    ).join("\n") + `\n</${searchType.toLowerCase().replace(" ", "_")}>\n`;
  };