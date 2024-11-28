import { DatabaseService } from "./DatabaseService";
import { OpenAIService } from "./OpenAIService";
import { SearchService } from "./SearchService";
import { TextService } from "./TextService";
import { VectorService } from "./VectorService";
import { v4 as uuidv4 } from 'uuid';


const openAIService = new OpenAIService();
const vectorService = new VectorService(openAIService);
const searchService = new SearchService(String(process.env.ALGOLIA_APP_ID), String(process.env.ALGOLIA_API_KEY));
const databaseService = new DatabaseService('events/database.db', searchService, vectorService);
const textService = new TextService();


async function simulateInteractions() {
    try {
      console.log('\nStarting AI Document Processing Simulation\n');

      // Create a sample document
      const sampleText = `# Sales Report Q3 2023
  
  ## Executive Summary
  Our Q3 sales have shown a 15% increase compared to Q2, with notable growth in our tech product line.
  
  ## Top Selling Products
  1. SmartPhone X
  2. Laptop Pro
  3. Wireless Earbuds
  
  ## Regional Performance
  - North America: 40% of total sales
  - Europe: 35% of total sales
  - Asia: 25% of total sales
  
  ## Recommendations
  We should focus on expanding our tech product line and increasing marketing efforts in Asia for Q4.`;
  
      const document = await textService.document(sampleText, 'gpt-4o', { 
        name: 'Q3 2023 Sales Report',
        uuid: uuidv4(),
        source_uuid: uuidv4(),
        conversation_uuid: uuidv4()
      });
      console.log('Created document:', document.metadata.name);
  
      await databaseService.insertDocument(document, true);
      const chunks = await textService.split(document.text, 1000);
      console.log(`Document split into ${chunks.length} chunks`);
  
      const toolUuid = uuidv4();
      await databaseService.createTool({
        uuid: toolUuid,
        name: 'Sales Analysis Tool',
        description: 'Analyzes sales reports and provides insights',
        instruction: 'Analyze the given sales report and summarize key points',
        parameters: JSON.stringify({ report_type: 'string', time_period: 'string' })
      });
      console.log('Created tool:', 'Sales Analysis Tool');
      if (!document.metadata.uuid) {
        throw new Error('Document UUID is undefined');
      }

      const conversationUuid = await databaseService.createConversation('user123', 'Q3 Sales Analysis');
      await databaseService.linkDocumentToConversation(conversationUuid, document.metadata.uuid);

      const userMessage = "Please analyze the Q3 2023 Sales Report and provide key insights.";
      await databaseService.addMessage(conversationUuid, 'user', userMessage);
      console.log('\nUser:', userMessage);

      console.log('\nProcessing Task:');
      const taskUuid = uuidv4();
      console.log('- Creating task:', 'Analyze Q3 2023 Sales Report');
      await databaseService.createTask({
        uuid: taskUuid,
        conversation_uuid: conversationUuid,
        type: 'async',
        description: 'Analyze Q3 2023 Sales Report'
      });

      const actionUuid = uuidv4();
      console.log('- Creating action: Document Analysis');
      await databaseService.addAction({
        uuid: actionUuid,
        task_uuid: taskUuid,
        tool_uuid: toolUuid,
        type: 'document_analysis',
        parameters: JSON.stringify({})
      });
      
      // Add this line to link the document to the action
      await databaseService.linkDocumentToAction(actionUuid, document.metadata.uuid);
      
      console.log('- Linking document to action');

      console.log('- Updating task status: In Progress');
      await databaseService.updateTaskStatus(taskUuid, 'in_progress');
      
      console.log('- Executing document analysis');
      await databaseService.updateAction(actionUuid, 'completed');
      
      console.log('- Completing task');
      await databaseService.updateTaskStatus(taskUuid, 'completed', 'Analysis of Q3 2023 Sales Report completed');

      const summary = `Based on the Q3 2023 Sales Report:
      1. Sales increased by 15% compared to Q2.
      2. Top selling products: SmartPhone X, Laptop Pro, Wireless Earbuds.
      3. North America leads in sales (40%), followed by Europe (35%) and Asia (25%).
      4. Recommendation: Expand tech product line and increase marketing in Asia for Q4.`;
  
      await databaseService.addMessage(conversationUuid, 'assistant', summary);
      console.log('\nAssistant:', summary);

      const messages = await databaseService.getConversationMessages(conversationUuid);
      const actions = await databaseService.getTaskActions(taskUuid);
      const retrievedDocument = await databaseService.getDocumentByUuid(document.metadata.uuid);
      const retrievedTool = await databaseService.getToolByUuid(toolUuid);
      const retrievedTask = await databaseService.getTaskByUuid(taskUuid);

      console.log('\nFinal Status:');
      console.log('Messages:', messages.length);
      console.log('Actions:', actions.length);
      console.log('Documents:', retrievedDocument ? 'Found' : 'Not found');
      console.log('Tools:', retrievedTool ? 'Found' : 'Not found');
      console.log('Tasks:', retrievedTask ? 'Found' : 'Not found');

      console.log('\nSimulation completed\n');

    } catch (error) {
      console.error('\nError during simulation:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
        console.error('Stack:', error.stack);
      }
    }
  }

  // Run the simulation
  simulateInteractions().then(() => console.log('Simulation completed'));
