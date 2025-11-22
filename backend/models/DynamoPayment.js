const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const TABLE_NAME = process.env.PAYMENTS_TABLE || 'Tappy_Payments';

class DynamoPayment {
    static async createPayment(payment) {
        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: payment,
                ConditionExpression: 'attribute_not_exists(id)'
            }));
            return true;
        } catch (e) {
            if (e.name === 'ConditionalCheckFailedException') {
                return false;
            }
            throw e;
        }
    }
}

module.exports = DynamoPayment;
