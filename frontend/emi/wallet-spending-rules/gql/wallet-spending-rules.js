import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFromwallet {
    getHelloWorldFromwallet {
      sn
    }
  }
`;

export const getSpendingRule = gql`
  query WalletGetSpendingRule($businessId: String) {
    WalletGetSpendingRule(businessId: $businessId) {
      id
      businessId
      businessName
      minOperationAmount
      productBonusConfigs {
        type
        concept
        bonusType
        bonusValueByBalance
        bonusValueByCredit
      }
      autoPocketSelectionRules {
        priority
        pocketToUse
        condition {
          pocket
          comparator
          value
        }
      }
      lastEditionTimestamp
      editedBy
    }
  }
`;

export const getSpendingRules = gql`query  WalletGetSpendingRules($page: Int!, $count: Int!, $filter: String, $sortColumn: String, $sortOrder: String   ){
  WalletGetSpendingRules(page: $page, count: $count,filter: $filter,sortColumn: $sortColumn,sortOrder: $sortOrder){
    id
    businessId
    businessName
    minOperationAmount
    productBonusConfigs{
      type
      concept
      bonusType
      bonusValueByBalance
      bonusValueByCredit
    }
    autoPocketSelectionRules{
      priority
      pocketToUse
      condition{
        pocket
        comparator
        value
      }
    }
    lastEditionTimestamp
    editedBy

  }
}
`;

export const updateSpendingRule = gql`
  mutation updateSpendingRule($input: WalletSpendingRuleInput) {
    walletUpdateSpendingRule(input: $input) {
      code
      message
    }
  }
`;

//Hello world sample, please remove
export const walletHelloWorldSubscription = gql`
  subscription {
    walletHelloWorldSubscription {
      sn
    }
  }
`;
