# ZK Panagram

- Each "answer is a "round"
- The Owner  is the only person that can start a new round
- The round needs to have a minimum duration
- There needs to be a "winner to start the next round
- The contrat needs to be an NFT contract
    - ERC-1155 (token id 0 for winners, token id 1 for runners up)
    - Mint ID 0 if the user is the first person to guess correctly  in the round
    - Mint ID 1 if they got it correct but they are not the first in that round
- To check if the user's guess is correct, we will  call the Verifier smart contract