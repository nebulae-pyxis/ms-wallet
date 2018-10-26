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

export const getWallet = gql`
  query getWallet($businessId: String!) {
    getWallet(businessId: $businessId) {
      _id
      pockets {
        balance
        bonus
        credit
      }
      state
      businessId
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
