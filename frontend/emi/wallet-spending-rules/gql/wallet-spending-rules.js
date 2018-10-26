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
      productUtilitiesConfig {
        type
        concept
        percentageByMain
        percentageByCredit
      }
      autoPocketSelection {
        priority
        toUse
        when {
          pocket
          comparator
          value
        }
      }
      lastEdition
      editedBy
    }
  }
`;

export const getSpendingRules = gql`
  query WalletGetSpendingRules(
    $page: Int!
    $count: Int!
    $filter: String
    $sortColumn: String
    $sortOrder: String
  ) {
    WalletGetSpendingRules(
      page: $page
      count: $count
      filter: $filter
      sortColumn: $sortColumn
      sortOrder: $sortOrder
    ) {
      id
      businessId
      minOperationAmount
      productUtilitiesConfig {
        type
        concept
        percentageByMain
        percentageByCredit
      }
      autoPocketSelection {
        priority
        toUse
        when {
          pocket
          comparator
          value
        }
      }
      lastEdition
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
