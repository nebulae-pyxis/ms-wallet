import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

// QUERIES

export const getWalletBusiness = gql`
  query getWalletBusiness {
    getWalletBusiness {
      _id
      name
    }
  }
`;

export const getWalletBusinesses = gql`
  query getWalletBusinesses {
    getWalletBusinesses {
      _id
      name
    }
  }
`;

export const getWalletBusinessById = gql`
  query getWalletBusinessById($id: ID!)  {
    getWalletBusinessById(id: $id) {
      _id
      name
    }
  }
`;

export const getWallet = gql`
  query getWallet($businessId: String!) {
    getWallet(businessId: $businessId) {
      _id
      pockets {
        balance
        bonus
      }
      spendingState
      businessId
    }
  }
`;

export const getWalletTransactionsHistory = gql`
  query getWalletTransactionsHistory($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    getWalletTransactionsHistory(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      timestamp
      businessId
      type
      concept
      pocket
      value
      user
      notes
      terminal {
        id
        userId
        username
      }
      location {
        geojson {
          type
          coordinates
        }
      }
    }
  }
`;

export const getWalletTransactionsHistoryById = gql`
  query getWalletTransactionsHistoryById($id: ID!) {
    getWalletTransactionsHistoryById(id: $id) {
      _id
      timestamp
      businessId
      type
      concept
      pocket
      value
      user
      notes
      terminal {
        id
        userId
        username
      }
      location {
        geojson {
          type
          coordinates
        }
      }
    }
  }
`;

export const getAssociatedTransactionsHistoryByTransactionHistoryId = gql`
  query getAssociatedTransactionsHistoryByTransactionHistoryId($id: ID!) {
    getAssociatedTransactionsHistoryByTransactionHistoryId(id: $id) {
      _id
      timestamp
      businessId
      type
      concept
      pocket
      value
      user
      notes
      terminal {
        id
        userId
        username
      }
      location {
        geojson {
          type
          coordinates
        }
      }
    }
  }
`;

// MUTATIONS
export const makeManualBalanceAdjustment = gql`
  mutation makeManualBalanceAdjustment($input: ManualBalanceAdjustmentInput) {
    makeManualBalanceAdjustment(input: $input) {
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
